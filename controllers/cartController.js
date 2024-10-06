// This file handles HTTP requests made to a urls used for by the cart

const express = require("express");
const router = express.Router();
const { Cart } = require("../models/Cart");
const { Purchase } = require("../models/Purchase");
const { Product } = require("../models/Product");
const User = require("../models/User");
const Coupon = require("../models/Coupon");
const Discount = require("../models/Discount");
const { ensureAuthenticated } = require("../middleware/auth");
const addToCart = require("../helpers/cartHelper");
const {
  validateCardNumber,
  validateExpiryDate,
  validateCVV,
} = require("../helpers/paymentHelper"); // Create this helper for payment validation
const mapToObject = require("../helpers/homepageHelper");
const axios = require("axios");

// Load environment variables
require("dotenv").config();

// Route for a POST request to add an item to cart
router.post("/add-to-cart", addToCart);

// Route for a POST request to update a current purchase
router.post("/cart/purchase", async (req, res) => {
  const username = req.session.user.username;
  const { shippingData, paymentData, couponCode } = req.body;

  try {
    // Find user's cart
    const cart = await Cart.findOne({ userName: username });
    if (!cart || cart.products.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Your cart is empty." });
    }

    // Validate shipping information
    if (!shippingData.street || !shippingData.number) {
      return res.status(400).json({
        success: false,
        message: "Please provide full shipping details.",
      });
    }

    // Validate payment details
    if (
      !validateCardNumber(paymentData.cardNumber) ||
      !validateExpiryDate(paymentData.expiryDate) ||
      !validateCVV(paymentData.cvv)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment details." });
    }

    // Mock a location verification (could be an external API in a real app)
    const isLocationValid = await verifyLocation(shippingData);
    if (!isLocationValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid shipping location." });
    }

    console.log(`Location is valid = ${isLocationValid}`);

    // Validate that product quantities are available in stock
    for (const cartItem of cart.products) {
      const product = await Product.findOne({ prodId: cartItem.prodId });

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${cartItem.name} not found.`,
        });
      }

      // Check if the color exists
      const colorsObject = mapToObject(product.colors);
      if (!colorsObject[cartItem.color]) {
        return res.status(400).json({
          success: false,
          message: `Color ${cartItem.color} for product ${cartItem.name} not found.`,
        });
      }

      // Check if the size exists for the selected color
      const sizeStock = colorsObject[cartItem.color][cartItem.size];
      if (!sizeStock) {
        return res.status(400).json({
          success: false,
          message: `Size ${cartItem.size} for product ${cartItem.name} not found.`,
        });
      }

      // Check if the requested quantity exceeds the available stock
      if (cartItem.quantity > sizeStock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${cartItem.name} (${cartItem.color} - ${cartItem.size}). Only ${sizeStock} left in stock.`,
        });
      }
    }

    // Get today's date for discount validity checks
    const today = new Date();

    // Find applicable discounts for the products in the cart
    const applicableDiscounts = await Discount.find({
      prodIds: { $in: cart.products.map((p) => p.prodId) },
      validFrom: { $lte: today },
      validUntil: { $gte: today },
    });

    let totalAmount = 0;

    // Calculate total price with product-level discounts applied
    const purchaseProducts = cart.products.map((item) => {
      let productPrice = item.price;
      let discountedPrice = productPrice;

      // Apply product-specific discount if any
      const discount = applicableDiscounts.find((d) =>
        d.prodIds.includes(item.prodId)
      );
      if (discount) {
        discountedPrice =
          productPrice * (1 - discount.discountPercentage / 100);
      }

      totalAmount += discountedPrice * item.quantity;

      return {
        prodId: item.prodId,
        name: item.name,
        price: item.price,
        category: item.category,
        company: item.company,
        gender: item.gender,
        color: item.color,
        size: item.size,
        image: item.image,
        imageType: item.imageType,
        quantityPurchased: item.quantity,
      };
    });

    // Apply coupon discount (if applicable)
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode });
      if (!coupon) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid coupon code." });
      }

      // Check if the coupon is valid
      const now = new Date();
      if (coupon.expireDate < now) {
        return res
          .status(400)
          .json({ success: false, message: "Coupon has expired." });
      }

      // Apply coupon discount on the total price after product-level discounts
      totalAmount = totalAmount * (1 - coupon.discountPercentage / 100);

      // Delete the coupon after it's used
      await Coupon.deleteOne({ code: couponCode });
    }

    // console.log({
    //   userName: username,
    //   productsInfo: purchaseProducts, // Products in the purchase
    //   TotalAmount: totalAmount.toFixed(2), // Total amount after all discounts
    // });

    // Create a new purchase record
    const newPurchase = new Purchase({
      userName: username,
      productsInfo: purchaseProducts, // Products in the purchase
      TotalAmount: totalAmount.toFixed(2), // Total amount after all discounts
    });

    // Save the purchase to the database
    await newPurchase.save();

    // Reduce stock for each product based on the purchase
    for (const cartItem of cart.products) {
      const product = await Product.findOne({ prodId: cartItem.prodId });

      const colorObject = mapToObject(product.colors);

      if (product) {
        const newQuantity =
          colorObject[cartItem.color][cartItem.size] - cartItem.quantity;

        // Ensure the new quantity is not negative (this shouldn't happen, but it's good to be safe)
        if (newQuantity < 0) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock for ${cartItem.name} (${cartItem.color} - ${cartItem.size}).`,
          });
        }

        // Use Product.updateOne to update the stock
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              [`colors.${cartItem.color}.${cartItem.size}`]: newQuantity,
            },
          }
        );
      }
    }

    // Clear the cart after successful purchase
    cart.products = [];

    // Remove the coupon from the cart after purchase
    // cart.discountPercentage = null;

    await cart.save(); // Save the cleared cart

    // Add the purchase to the user's purchase history
    const user = await User.findOne({ username: username });
    if (user) {
      user.purchaseHistory.push(newPurchase); // Add the purchase to the history
      await user.save(); // Save the updated user with the new purchase history
    }

    res.json({
      success: true,
      message: "Purchase completed successfully.",
      purchaseId: newPurchase._id,
    });
  } catch (error) {
    console.error("Error processing purchase:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

async function verifyLocation(shippingData) {
  // Example of using a geolocation service (you can use Google Maps Geocoding or mock this part)
  // You would replace this with a real API call if you want actual location verification
  const response = await axios.get(
    `https://api.opencagedata.com/geocode/v1/json`,
    {
      params: {
        q: `${shippingData.street} ${shippingData.number}, ${shippingData.city}, ${shippingData.country}`,
        pretty: 1, // Optional: prettify the response
        no_annotations: 1, // Optional: reduce the response data
        key: process.env.OPENCAGE_API_KEY, // Add your OpenCage API key here
        language: "en", // Ensure the address is interpreted in English
        countrycode: "IL", // Limit results to Israel (ISO 3166-1 country code)
      },
    }
  );
  return response.data.results.length > 0;

  // For now, we'll mock the location verification
  return true;
}

// router.post("/cart/purchase", async (req, res) => {
//   const username = req.session.user.username;

//   try {
//     const cart = await Cart.findOne({ userName: username });
//     if (!cart || cart.products.length === 0) {
//       return res.redirect("/cart");
//     }

//     // Process the purchase (create a purchase record, reduce stock, etc.)
//     // Example: Clear the cart after purchase
//     cart.products = [];
//     await cart.save();

//     res.redirect("/cart");
//   } catch (err) {
//     console.error("Error processing purchase:", err);
//     res.status(500).send("Server error");
//   }
// });

// Route for a POST request to remove an item from the cart 
router.post("/cart/remove-item", async (req, res) => {
  const { prodId, color, size } = req.body;
  const username = req.session.user.username;

  try {
    // Remove the item from the cart
    await Cart.updateOne(
      { userName: username },
      { $pull: { products: { prodId, color, size } } } // Match the product, color, and size and remove it
    );

    // Fetch the updated cart after removing the item
    const cart = await Cart.findOne({ userName: username });

    // Reset any applied coupon when an item is removed
    if (cart) {
      cart.discountPercentage = null; // Remove coupon
      await cart.save();
    }

    const cartItems = cart ? cart.products : [];

    // Get today's date for discount validity checks
    const today = new Date();

    // Find applicable discounts for the products in the cart
    const applicableDiscounts = await Discount.find({
      prodIds: { $in: cartItems.map((p) => p.prodId) },
      validFrom: { $lte: today }, // Check if the discount is valid from this date
      validUntil: { $gte: today }, // Check if the discount is still valid
    });

    let cartTotal = 0;

    // Recalculate the cart total with discounts applied (if any)
    cartItems.forEach((item) => {
      let productPrice = item.price;
      let discountedPrice = productPrice;

      // Check if the product has an applicable discount
      const discount = applicableDiscounts.find((d) =>
        d.prodIds.includes(item.prodId)
      );

      if (discount) {
        // Apply discount to the product price
        discountedPrice =
          productPrice * (1 - discount.discountPercentage / 100);
      }

      // Calculate the total price with the discounted price
      cartTotal += discountedPrice * item.quantity;
    });

    // Ensure that cartTotal is always a valid number, even if it's zero
    cartTotal = cartTotal || 0;

    // Send the updated cart total, item count, and a signal to reset the coupon CSS
    res.json({
      success: true,
      cartTotal: cartTotal.toFixed(2), // Return cartTotal as a string with two decimal places
      cartItemCount: cartItems.length,
      resetCoupon: true, // Signal to reset the coupon display
    });
  } catch (err) {
    console.error("Error removing item from cart:", err);
    res
      .status(500)
      .json({ success: false, message: "Error removing item from cart" });
  }
});

// Route for a POST request to update an item in the cart
router.post("/cart/update-item", async (req, res) => {
  const { prodId, color, size, newQuantity } = req.body;
  const username = req.session.user.username;
  console.log(req.body); // Debugging output to check the request body

  try {
    // Find the user's cart
    const cart = await Cart.findOne({ userName: username });
    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    // Find the product in the cart by prodId, color, and size
    const product = cart.products.find(
      (item) =>
        item.prodId === prodId && item.color === color && item.size === size
    );

    if (!product) {
      return res.json({ success: false, message: "Product not found in cart" });
    }

    // Update the quantity for the specific product
    product.quantity = parseInt(newQuantity, 10); // Ensure the quantity is an integer
    console.log(`Updated quantity for ${product.name}: ${product.quantity}`);

    // Save the updated cart to the database
    await cart.save(); // Ensure the updated quantity is saved in MongoDB
    console.log("Cart updated!");

    // Get today's date for discount validity checks
    const today = new Date();

    // Find applicable discounts for the products in the cart
    const applicableDiscounts = await Discount.find({
      prodIds: { $in: cart.products.map((p) => p.prodId) },
      validFrom: { $lte: today }, // Check if the discount is valid from this date
      validUntil: { $gte: today }, // Check if the discount is still valid
    });

    // Recalculate cart total with discounts applied (if any)
    let cartTotal = 0;
    let productTotal = 0;

    cart.products.forEach((item) => {
      let productPrice = item.price;
      let discountedPrice = productPrice;

      // Check if the product has an applicable discount
      const discount = applicableDiscounts.find((d) =>
        d.prodIds.includes(item.prodId)
      );

      if (discount) {
        // Apply discount to the product price
        discountedPrice =
          productPrice * (1 - discount.discountPercentage / 100);
      }

      // Add the discounted price (or regular price if no discount) to the total
      cartTotal += discountedPrice * item.quantity;

      // Calculate the total for the updated product
      if (
        item.prodId === prodId &&
        item.color === color &&
        item.size === size
      ) {
        productTotal = discountedPrice * item.quantity;
      }
    });

    // Send the updated cart total and product total back to the frontend
    return res.json({
      success: true,
      cartTotal: cartTotal.toFixed(2), // Total for the entire cart
      productTotal: productTotal.toFixed(2), // Total for the specific product
    });
  } catch (err) {
    console.error("Error updating cart quantity:", err);
    res.status(500).send("Server error");
  }
});

// router.post("/cart/update-item", async (req, res) => {
//   const { prodId, newQuantity } = req.body;
//   const username = req.session.user.username;

//   try {
//     const cart = await Cart.findOne({ userName: username });
//     if (cart) {
//       const product = cart.products.find((item) => item.prodId === prodId);

//       if (product) {
//         product.quantity = parseInt(newQuantity, 10); // Update quantity
//         await cart.save();
//         return res.json({ success: true });
//       }
//     }
//     res.json({ success: false });
//   } catch (err) {
//     console.error("Error updating cart quantity:", err);
//     res.status(500).send("Server error");
//   }
// });

// Route for a GET request to fetch the user's cart content
router.get("/cart", ensureAuthenticated, async (req, res) => {
  try {
    const username = req.session.user.username; // Get logged-in user
    const cart = await Cart.findOne({ userName: username });

    // Find the user by username and password
    const user = await User.findOne({ username });

    // If the cart is empty, send an empty array
    const cartItems = cart ? cart.products : [];

    // Get today's date for discount validity checks
    const today = new Date();

    // Find applicable discounts for the products in the cart
    const applicableDiscounts = await Discount.find({
      prodIds: { $in: cartItems.map((p) => p.prodId) },
      validFrom: { $lte: today }, // Check if the discount is valid from this date
      validUntil: { $gte: today }, // Check if the discount is still valid
    });

    let cartTotal = 0;

    // Modify each cart item to apply discounts (if any) and calculate total price
    const updatedCartItems = cartItems.map((item) => {
      // Convert the Mongoose document to a plain JavaScript object
      const plainItem = item.toObject();

      // Check if the product has an applicable discount
      const discount = applicableDiscounts.find((d) =>
        d.prodIds.includes(plainItem.prodId)
      );

      let originalPrice = plainItem.price;
      let discountedPrice = originalPrice;

      if (discount) {
        // Apply discount to the product price
        discountedPrice =
          originalPrice * (1 - discount.discountPercentage / 100);
      }

      // Increase cart total with discounted price (or original price if no discount)
      cartTotal += discountedPrice * plainItem.quantity;

      // Return the updated item with the discount applied
      return {
        ...plainItem,
        originalPrice, // Original price without the discount
        discountedPrice: discountedPrice.toFixed(2), // Discounted price if applicable
      };
    });

    const isAdmin = req.session.user && req.session.user.role === "admin";

    // Render the cart page with the updated items and total
    res.render("cart", {
      cart: updatedCartItems, // Pass the updated cart items to the template
      isAdmin,
      user,
      username,
      cartTotal: cartTotal.toFixed(2), // Pass the total cart price (with discounts)
      cartItemCount: cartItems.length, // Show cart badge count in navbar
      currentPage: "cart", // Pass the current page identifier
    });
  } catch (err) {
    console.error("Error loading cart:", err);
    res.status(500).send("Error loading cart");
  }
});

// Route for a POST request to remove a coupon in the cart
router.post("/cart/remove-coupon", async (req, res) => {
  const username = req.session.user.username;

  try {
    const cart = await Cart.findOne({ userName: username });

    if (!cart) {
      return res
        .status(400)
        .json({ success: false, message: "Cart not found" });
    }

    // Remove the coupon and restore the original price
    cart.discountPercentage = null;

    await cart.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing coupon:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Route for a POST request to apply a coupon in the cart
router.post("/cart/apply-coupon", async (req, res) => {
  const { couponCode } = req.body;
  const username = req.session.user.username;

  try {
    // Find the coupon by code
    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid coupon code" });
    }

    // Check if the coupon is still valid
    const now = new Date();
    if (coupon.expireDate < now) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon has expired" });
    }

    // Fetch the user's cart
    const cart = await Cart.findOne({ userName: username });
    if (!cart) {
      return res
        .status(400)
        .json({ success: false, message: "Cart not found" });
    }

    // Get today's date for discount validity checks
    const today = new Date();

    // Find applicable discounts for the products in the cart
    const applicableDiscounts = await Discount.find({
      prodIds: { $in: cart.products.map((p) => p.prodId) },
      validFrom: { $lte: today }, // Check if the discount is valid from this date
      validUntil: { $gte: today }, // Check if the discount is still valid
    });

    let originalTotalPrice = 0; // Price with product discounts but without the coupon
    let discountedTotalPrice = 0; // Final price after both discounts and coupons

    // Calculate the original and discounted totals (considering both discounts and coupons)
    cart.products.forEach((product) => {
      let productPrice = product.price;
      let discountedPrice = productPrice;

      // Check if a discount applies to the product
      const discount = applicableDiscounts.find((d) =>
        d.prodIds.includes(product.prodId)
      );

      if (discount) {
        // Apply the discount to the product price
        discountedPrice =
          productPrice * (1 - discount.discountPercentage / 100);
      }

      // Before applying the coupon, calculate the price after discounts
      originalTotalPrice += discountedPrice * product.quantity;

      // Now apply the coupon discount on top of the discounted price
      const finalPrice =
        discountedPrice * (1 - coupon.discountPercentage / 100);

      // Add the coupon-applied price to the final total
      discountedTotalPrice += finalPrice * product.quantity;
    });

    // Return the original and discounted totals to the frontend
    res.json({
      success: true,
      originalTotalPrice: parseFloat(originalTotalPrice).toFixed(2), // Price after discounts but before the coupon
      discountedTotalPrice: parseFloat(discountedTotalPrice).toFixed(2), // Final price after both discounts and the coupon
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
