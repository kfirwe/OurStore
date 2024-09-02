const { Product } = require("../models/Product");

exports.getHomePage = async (req, res) => {
  try {
    const filters = {};

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

    if (req.query.category) {
      filters.category = req.query.category;
    }

    if (req.query.gender) {
      filters.gender = req.query.gender; // this line ensures gender is included in the filter
    }

    if (req.query.nonSoldOut === "true") {
      filters.amount = { $gt: 0 };
    }

    const products = await Product.find(filters);
    const UnFilteredProducts = await Product.find({});

    res.render("homePage", {
      isAdmin: req.session.user.role === "admin",
      username: req.session.user.username,
      UnFilteredProducts,
      products: products,
      filters: req.query, // Pass the filters back to the template to maintain filter values
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Server Error");
  }
};
