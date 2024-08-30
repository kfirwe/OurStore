const express = require("express");
const multer = require("multer");
const uuid = require("uuid");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth"); // Correct import
const isAdmin = require("../middleware/isAdmin");
const User = require("../models/User");
const { Product } = require("../models/Product");

// Define the uploads directory
const uploadDir = path.join(__dirname, "../uploads");

// Ensure the uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Define storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, uuid.v4() + path.extname(file.originalname));
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only images are allowed"));
  }
};

// Initialize upload with multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

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

// Route to handle adding a product
router.post("/admin/add-product", upload.single("image"), async (req, res) => {
  try {
    const { name, price, category, company, gender } = req.body;
    const prodId = uuid.v4(); // Generate a unique product ID
    const image = req.file.filename; // Get the uploaded image's filename

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
    console.error("Error adding product:", error);
    res.status(500).send("Server Error");
  }
});

// Admin route to handle product update
router.post(
  "/admin/update-product",
  ensureAuthenticated,
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { productId, name, price, category, company, gender } = req.body;
      const image = req.file ? req.file.filename : undefined;

      const updateData = { name, price, category, company, gender };
      if (image) {
        updateData.image = image;
      }

      await Product.findByIdAndUpdate(productId, updateData);
      res.redirect("/admin");
    } catch (error) {
      console.error("Error updating product:", error);
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
