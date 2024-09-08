const { Product } = require("../models/Product");
const { Cart } = require("../models/Cart"); // Assuming you have a Cart model
const createLog = require("../helpers/logHelper");
require("dotenv").config();

exports.getHomePage = async (req, res) => {
  try {
    const filters = {};
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = 3; // Limit the products to 6 per page
    const skip = (page - 1) * limit;

    // Apply name filter if provided
    if (req.query.name) {
      filters.name = new RegExp(req.query.name, "i"); // case-insensitive search
    }

    // Apply price filter if provided
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

    // Apply category filter if provided
    if (req.query.category) {
      filters.category = req.query.category;
    }

    // Apply gender filter if provided
    if (req.query.gender) {
      filters.gender = req.query.gender; // this will filter products by gender
    }

    // Apply non-sold-out filter if provided
    if (req.query.nonSoldOut === "true") {
      filters.amount = { $gt: 0 }; // Fetch only products with stock > 0
    }

    // Fetch products with pagination
    const products = await Product.find(filters).skip(skip).limit(limit);

    // Fetch all products without filters for sidebar or other purposes
    const UnFilteredProducts = await Product.find({});

    // Fetch total number of filtered products for pagination calculation
    const totalProducts = await Product.countDocuments(filters);
    const totalPages = Math.ceil(totalProducts / limit); // Calculate the total number of pages

    // Fetch weather API key for any potential weather data integration
    const weatherApiKey = process.env.WEATHER_API_KEY;

    // Render the homepage with filtered products, pagination, and other data
    res.render("homePage", {
      isAdmin: req.session.user ? req.session.user.role === "admin" : false, // Check if the user is an admin
      username: req.session.user ? req.session.user.username : "", // Pass the logged-in user's username
      weatherApiKey, // Weather API key if needed on the page
      UnFilteredProducts, // All products for any additional use
      products, // Filtered products to display
      currentPage: page, // Current page number
      totalPages, // Total number of pages
      filters: req.query, // Pass the filters to maintain filter values in the form
    });
  } catch (err) {
    // Handle any errors that occur during the fetch or render process
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

    // Check if product is out of stock
    const isAvailable = product.amount > 0;

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

exports.addToCart = async (req, res) => {
  try {
    const { userName, prodId } = req.body;

    // Find the product by prodId
    const product = await Product.findOne({ prodId });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if the product is available (amount > 0)
    if (product.amount <= 0) {
      return res
        .status(400)
        .json({ message: "The product is not available now!" });
    }

    // Find the user's cart or create a new one if it doesn't exist
    let cart = await Cart.findOne({ userName });

    if (!cart) {
      // Create a new cart for the user if it doesn't exist
      cart = new Cart({ userName, products: [] });
    }

    // Check if the product is already in the cart
    const productInCart = cart.products.find((item) => item.prodId === prodId);

    if (productInCart) {
      return res.status(400).json({
        message:
          "The product is already in your cart! Please change the quantity in the cart tab.",
      });
    }

    // Add the product to the cart with default quantity 1
    cart.products.push({
      ...product.toObject(),
      quantity: 1,
    });

    await cart.save(); // Save the cart

    return res
      .status(200)
      .json({ message: "Product added to cart successfully!" });
  } catch (err) {
    console.error("Error adding product to cart:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
