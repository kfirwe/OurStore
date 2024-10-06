// This file hanles the HTTP request for the home page

const { Product } = require("../models/Product");
const { Wishlist } = require("../models/Wishlist");
const Discount = require("../models/Discount"); // Include the discount model
const { Cart } = require("../models/Cart"); // Assuming you have a Cart model
const createLog = require("../helpers/logHelper");
const mapToObject = require("../helpers/homepageHelper");
require("dotenv").config();

exports.getHomePage = async (req, res) => {
  try {
    const filters = {};
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = 6; // Limit the products to 6 per page
    const skip = (page - 1) * limit;

    // Fetch the current user's username
    const username = req.session.user ? req.session.user.username : "";

    // Fetch the cart for the current user and calculate cart item count
    let cartItemCount = 0;
    if (username) {
      const cart = await Cart.findOne({ userName: username });
      if (cart) {
        cartItemCount = cart.products.length; // Count the number of distinct items in the cart
      }
    }

    // Initialize wishlist array to store product IDs
    let wishlist = [];
    if (username) {
      const userWishlist = await Wishlist.findOne({ userName: username });
      if (userWishlist) {
        wishlist = userWishlist.products.map((product) => product.prodId); // Get all product IDs from the user's wishlist
      }
    }

    // Check if the user is filtering by wishlist
    if (req.query.wishlist === "true") {
      if (!username) {
        return res.redirect("/login"); // Redirect to login if user is not logged in
      }
      if (wishlist.length > 0) {
        filters.prodId = { $in: wishlist }; // Filter products in the wishlist
      } else {
        filters.prodId = { $in: [] }; // If no wishlist, return no products
      }
    }

    // Apply other filters (name, price, category, gender, etc.)
    if (req.query.name) {
      filters.name = new RegExp(req.query.name, "i"); // case-insensitive search
    }

    if (req.query.price) {
      const priceCondition = req.query.priceCondition || "equal";
      const priceValue = parseFloat(req.query.price);

      if (priceCondition === "equal") {
        filters.price = priceValue;
      } else if (priceCondition === "greater") {
        filters.price = { $gt: priceValue };
      } else if (priceCondition === "less") {
        filters.price = { $lt: priceValue };
      } else if (priceCondition === "between" && req.query.priceMax) {
        filters.price = {
          $gte: priceValue,
          $lte: parseFloat(req.query.priceMax),
        };
      }
    }

    // Apply category and gender filters
    if (req.query.category) {
      filters.category = req.query.category;
    }

    if (req.query.gender) {
      filters.gender = req.query.gender; // Filter products by gender
    }

    // Apply color and size filters
    if (req.query.color) {
      filters[`colors.${req.query.color}`] = { $exists: true }; // Filter by color
    }

    if (req.query.size) {
      const sizeQuery = req.query.size.toUpperCase(); // Ensure consistency with uppercase sizes
      filters.$expr = {
        $gt: [
          {
            $sum: {
              $map: {
                input: { $objectToArray: "$colors" },
                as: "color",
                in: {
                  $cond: [
                    { $ifNull: [`$$color.v.${sizeQuery}`, false] },
                    `$$color.v.${sizeQuery}`,
                    0,
                  ],
                },
              },
            },
          },
          0,
        ],
      };
    }

    // Apply non-sold-out filter if provided
    if (req.query.nonSoldOut === "true") {
      // We will handle this filter after we calculate the `isSoldOut` field dynamically below
    }

    // If "Products with Discounts" filter is checked
    if (req.query.discounted === "true") {
      const discountedProducts = await Discount.find({});
      const productIdsWithDiscounts = discountedProducts.flatMap(
        (discount) => discount.prodIds
      );
      filters.prodId = { $in: productIdsWithDiscounts }; // Only fetch products with discounts
    }

    // Fetch products with pagination and filters
    let products = await Product.find(filters).skip(skip).limit(limit);

    // Fetch discounts for products that appear in the prodIds array
    const discounts = await Discount.find({
      prodIds: { $in: products.map((p) => p.prodId) },
    });

    // Attach the highest valid discount and calculate `isSoldOut` dynamically
    let productsWithDiscounts = products.map((product) => {
      const now = new Date();

      // Filter for discounts that are valid and apply to the product
      const validProductDiscounts = discounts.filter(
        (d) =>
          d.prodIds.includes(product.prodId) &&
          new Date(d.validFrom) <= now && // Check if the discount is active
          new Date(d.validUntil) >= now
      );

      // Find the highest discount percentage among valid discounts
      const maxDiscount =
        validProductDiscounts.length > 0
          ? Math.max(...validProductDiscounts.map((d) => d.discountPercentage))
          : null;

      // Calculate the discounted price (if any)
      let discountedPrice = null;
      if (maxDiscount) {
        discountedPrice = (product.price * (1 - maxDiscount / 100)).toFixed(2); // Round to 2 decimal places
      }

      // Convert Map to a plain object before sending to the EJS template
      const colorsObject = mapToObject(product.colors);

      // Calculate total stock for the product
      let totalAmount = 0;
      for (const color in colorsObject) {
        const sizes = colorsObject[color];
        totalAmount += Object.values(sizes).reduce(
          (sum, quantity) => sum + quantity,
          0
        );
      }

      return {
        ...product.toObject(),
        isSoldOut: totalAmount === 0, // If totalAmount is 0, mark as sold out
        discountPercentage: maxDiscount, // Attach the highest valid discount, if any
        discountedPrice, // Attach the calculated discounted price, if any
        colors: colorsObject, // Now colors is a plain object
      };
    });

    // Apply `nonSoldOut` filter after mapping
    if (req.query.nonSoldOut === "true") {
      productsWithDiscounts = productsWithDiscounts.filter(
        (product) => !product.isSoldOut
      );
    }

    // Fetch all products without filters for sidebar or other purposes
    const UnFilteredProducts = await Product.find({}); // Fetch all products

    // Map over the products to calculate `isSoldOut` for each product
    const mappedProducts = UnFilteredProducts.map((product) => {
      const colors = mapToObject(product.colors); // Convert Map to Object
      let totalAmount = 0;

      // Calculate total stock for the product
      for (const color in colors) {
        const sizes = colors[color];
        totalAmount += Object.values(sizes).reduce(
          (sum, quantity) => sum + quantity,
          0
        );
      }

      return {
        ...product.toObject(),
        isSoldOut: totalAmount === 0, // Product is sold out if total quantity is 0
      };
    });

    // Fetch total number of filtered products for pagination calculation
    const totalProducts = await Product.countDocuments(filters);
    const totalPages = Math.ceil(totalProducts / limit); // Calculate the total number of pages

    // Fetch weather API key for any potential weather data integration
    const weatherApiKey = process.env.WEATHER_API_KEY;

    // Render the homepage with filtered products, unfiltered products, pagination, and other data
    res.render("homePage", {
      isAdmin: req.session.user ? req.session.user.role === "admin" : false, // Check if the user is an admin
      username, // Pass the logged-in user's username
      cartItemCount, // Number of distinct items in the cart
      wishlist, // Pass the wishlist product IDs to the front end
      weatherApiKey, // Weather API key for integration
      products: productsWithDiscounts, // Filtered products to display
      UnFilteredProducts: mappedProducts, // All products without filters
      currentPage: page, // Current page number for pagination
      totalPages, // Total number of pages for pagination
      filters: req.query, // Pass the filters to maintain filter values in the form
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Server Error");
  }
};

// Product availability check endpoint
exports.checkProductAvailability = async (req, res) => {
  try {
    const prodId = req.params.prodId;

    // Fetch the product by prodId
    const product = await Product.findOne({ prodId });

    // If product not found
    if (!product) {
      return res.status(404).json({
        available: false,
        inCart: false,
        message: "Product not found",
      });
    }

    // Calculate total stock dynamically based on the colors and sizes
    const colors = product.colors; // Assuming product.colors is a Map or similar object
    let totalAmount = 0;

    // Iterate through colors and sizes to calculate total stock
    for (const color in colors) {
      const sizes = colors[color];
      totalAmount += Object.values(sizes).reduce(
        (sum, quantity) => sum + quantity,
        0
      );
    }

    // Check if the product is out of stock based on total calculated stock
    const isAvailable = totalAmount > 0;

    // Check if the product is already in the user's cart
    const cart = await Cart.findOne({
      userId: req.session.user ? req.session.user.id : null,
    });

    let isInCart = false;
    if (cart && cart.items) {
      // Check if the product is already in the cart
      isInCart = cart.items.some((item) => item.prodId === prodId);
    }

    // Return product availability and cart status
    return res.json({ available: isAvailable, inCart: isInCart });
  } catch (err) {
    console.error("Error checking product availability:", err);
    return res
      .status(500)
      .json({ available: false, inCart: false, message: "Server error" });
  }
};
