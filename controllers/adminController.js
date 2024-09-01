const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth"); // Correct import
const isAdmin = require("../middleware/isAdmin");
const User = require("../models/User");
const { Product } = require("../models/Product");

// Set up multer for file upload
const storage = multer.memoryStorage(); // Store files in memory, not on disk
const upload = multer({ storage: storage });

// Example route using the middleware
router.get("/admin", ensureAuthenticated, isAdmin, async (req, res) => {
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
router.post(
  "/admin/delete-user",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const { userId } = req.body;
      await User.findByIdAndDelete(userId);
      res.redirect("/admin");
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  }
);

// Update field for User or Product
router.post(
  "/admin/update-field",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    let { id, field, value } = req.body;

    if (typeof value == "string") {
      value = value.trim();
    }

    try {
      if (
        field === "username" ||
        field === "email" ||
        field === "phone" ||
        field === "city" ||
        field === "country" ||
        field === "role"
      ) {
        await User.findByIdAndUpdate(id, { [field]: value });
      } else {
        await Product.findByIdAndUpdate(id, { [field]: value });
      }

      // Update session if the logged-in user changed their own username
      if (field === "username" && req.session.user.id === id) {
        req.session.user.username = value;
      }

      res.status(200).send("Field updated");
    } catch (error) {
      console.error("Error updating field:", error);
      res.status(500).send("Error updating field");
    }
  }
);

// Update user route
router.post(
  "/admin/update-user",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
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
  }
);

// Add user route
router.post(
  "/admin/add-user",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const { username, password, email, phone, city, country, role } =
        req.body;
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
  }
);

router.post("/admin/add-product", upload.single("image"), async (req, res) => {
  try {
    const newProduct = new Product({
      prodId: uuidv4(), // Generate a unique ID
      name: req.body.name,
      price: req.body.price,
      category: req.body.category,
      company: req.body.company,
      gender: req.body.gender,
      image: req.file.buffer, // Store the file buffer (binary data)
      imageType: req.file.mimetype, // Store the MIME type of the image
    });

    await newProduct.save();
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.post(
  "/admin/update-product",
  upload.single("image"),
  async (req, res) => {
    try {
      const updateData = {
        name: req.body.name,
        price: req.body.price,
        category: req.body.category,
        company: req.body.company,
        gender: req.body.gender,
      };

      // Only update the image if a new one was uploaded
      if (req.file) {
        updateData.image = req.file.buffer;
        updateData.imageType = req.file.mimetype;
      }

      await Product.findByIdAndUpdate(req.body.productId, updateData);
      res.redirect("/admin");
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);

// Admin Controller
const multer = require("multer");

// Handle image update
router.post(
  "/admin/update-product-image",
  upload.single("image"),
  async (req, res) => {
    try {
      const productId = req.body.productId;
      const image = req.file.buffer;

      await Product.findByIdAndUpdate(productId, { image: image });

      res.redirect("/admin");
    } catch (error) {
      console.error("Error updating product image:", error);
      res.status(500).send("Server error");
    }
  }
);

// Admin route to handle product deletion
router.post(
  "/admin/delete-product",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const { productId } = req.body;
      await Product.findByIdAndDelete(productId);
      res.redirect("/admin");
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
