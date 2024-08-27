const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth"); // Correct import
const User = require("../models/User");
const { Product } = require("../models/Product");

// Example route using the middleware
router.get("/admin", ensureAuthenticated, async (req, res) => {
  try {
    // Fetch all users and products to display on the admin page
    const users = await User.find({});
    const products = await Product.find({});
    res.render("admin", { users, products });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Delete user route
router.post("/admin/delete-user", ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndDelete(userId);
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Update user route
router.post("/admin/update-user", ensureAuthenticated, async (req, res) => {
  try {
    const { userId, username, email, phone, city, country, role } = req.body;
    await User.findByIdAndUpdate(userId, {
      username,
      email,
      phone,
      city,
      country,
      role,
    });
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Add user route
router.post("/admin/add-user", ensureAuthenticated, async (req, res) => {
  try {
    const { username, password, email, phone, city, country, role } = req.body;
    const newUser = new User({
      username,
      password,
      email,
      phone,
      city,
      country,
      role,
    });
    await newUser.save();
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Add product route
router.post("/admin/add-product", ensureAuthenticated, async (req, res) => {
  try {
    const { prodId, name, price, category, company, gender, image } = req.body;
    const newProduct = new Product({
      prodId,
      name,
      price,
      category,
      company,
      gender,
      image,
    });
    await newProduct.save();
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Update product route
router.post("/admin/update-product", ensureAuthenticated, async (req, res) => {
  try {
    const { productId, name, price, category, company, gender, image } =
      req.body;
    await Product.findByIdAndUpdate(productId, {
      name,
      price,
      category,
      company,
      gender,
      image,
    });
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Delete product route
router.post("/admin/delete-product", ensureAuthenticated, async (req, res) => {
  try {
    const { productId } = req.body;
    await Product.findByIdAndDelete(productId);
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

module.exports = router;
