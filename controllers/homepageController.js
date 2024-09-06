const { Product } = require("../models/Product");
const createLog = require("../helpers/logHelper");
require("dotenv").config();

exports.getHomePage = async (req, res) => {
  try {
    const filters = {};

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

    // Fetch products with filters
    const products = await Product.find(filters);

    // Fetch all products without filters for sidebar or other purposes
    const UnFilteredProducts = await Product.find({});

    // Fetch weather API key for any potential weather data integration
    const weatherApiKey = process.env.WEATHER_API_KEY;

    // Render the homepage with filtered products and other data
    res.render("homePage", {
      isAdmin: req.session.user ? req.session.user.role === "admin" : false, // Check if the user is an admin
      username: req.session.user ? req.session.user.username : "", // Pass the logged-in user's username
      weatherApiKey, // Weather API key if needed on the page
      UnFilteredProducts, // All products for any additional use
      products, // Filtered products to display
      filters: req.query, // Pass the filters to maintain filter values in the form
    });
  } catch (err) {
    // Handle any errors that occur during the fetch or render process
    console.error("Error fetching products:", err);
    res.status(500).send("Server Error");
  }
};
