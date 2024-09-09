const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const User = require("../models/User");
const { Product } = require("../models/Product");
const { Cart } = require("../models/Cart");
const { Purchase } = require("../models/Purchase");
const { postTweet } = require("./twitterController");
const Coupon = require("../models/Coupon");
const createLog = require("../helpers/logHelper");
const { Log } = require("../models/Log");

// Set up multer for file upload
const storage = multer.memoryStorage(); // Store files in memory, not on disk
const upload = multer({ storage: storage });

// Example route using the middleware
router.get("/admin", ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    const tab = req.query.tab || "users"; // Default to 'users' if no tab is specified
    const logs = await Log.find({}).sort({ Date: -1 });
    const users = await User.find({});
    const products = await Product.find({});
    const purchases = await Purchase.find().sort({ Date: -1 }).lean();
    const coupons = await Coupon.find({}).sort({ expireDate: 1 });

    // Fetch the cart for the current user
    let cartItemCount = 0;
    if (req.session.user?.username) {
      const cart = await Cart.findOne({ userName: req.session.user.username });
      if (cart) {
        cartItemCount = cart.products.length; // Count the number of distinct items in the cart
      }
    }

    res.render("admin", {
      users,
      products,
      purchases,
      coupons,
      cartItemCount,
      logs,
      tab, // Pass the active tab to the view
      filters: {},
      username: req.session.user ? req.session.user.username : null, // Pass username from session or null
      isAdmin: req.session.user && req.session.user.role === "admin", // Check if user is admin
    });
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
      await createLog(
        "INFO",
        req.session.user.username,
        `User with ID ${userId} deleted.`
      );
    } catch (error) {
      console.error(error);
      await createLog(
        "ERROR",
        req.session.user.username,
        `Failed to delete user with ID ${userId}.`
      );
      res.status(500).send("Server error");
    }
  }
);

// Update field for User, Product, or Coupon
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
      } else if (
        field === "code" ||
        field === "discountPercentage" ||
        field === "expireDate"
      ) {
        await Coupon.findByIdAndUpdate(id, { [field]: value });
      } else {
        await Product.findByIdAndUpdate(id, { [field]: value });
      }

      // Update session if the logged-in user changed their own username
      if (field === "username" && req.session.user.id === id) {
        req.session.user.username = value;
      }

      res.status(200).send("Field updated");
      await createLog(
        "INFO",
        req.session.user.username,
        `Field ${field} updated for ID ${id}.`
      );
    } catch (error) {
      console.error("Error updating field:", error);
      await createLog(
        "ERROR",
        req.session.user.username,
        `Failed to update field ${field} for ID ${id}.`
      );
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
      await createLog(
        "INFO",
        req.session.user.username,
        `User with ID ${userId} updated.`
      );
    } catch (error) {
      console.error(error);
      await createLog(
        "ERROR",
        req.session.user.username,
        `Failed to update user with ID ${userId}.`
      );
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
      await createLog(
        "INFO",
        req.session.user.username,
        `New user ${username} added.`
      );
    } catch (error) {
      console.error(error);
      await createLog(
        "ERROR",
        req.session.user.username,
        "Failed to add new user."
      );
      res.status(500).send("Server error");
    }
  }
);

// Add product route
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
    await createLog(
      "INFO",
      req.session.user.username,
      `New product ${req.body.name} added.`
    );
  } catch (err) {
    console.error(err);
    await createLog(
      "ERROR",
      req.session.user.username,
      "Failed to add new product."
    );
    res.status(500).send("Server error");
  }
});

// Update product route
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
      await createLog(
        "INFO",
        req.session.user.username,
        `Product with ID ${req.body.productId} updated.`
      );
    } catch (err) {
      console.error(err);
      await createLog(
        "ERROR",
        req.session.user.username,
        `Failed to update product with ID ${req.body.productId}.`
      );
      res.status(500).send("Server error");
    }
  }
);

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
      await createLog(
        "INFO",
        req.session.user.username,
        `Product image updated for ID ${productId}.`
      );
    } catch (error) {
      console.error("Error updating product image:", error);
      await createLog(
        "ERROR",
        req.session.user.username,
        `Failed to update product image for ID ${productId}.`
      );
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
      await createLog(
        "INFO",
        req.session.user.username,
        `Product with ID ${productId} deleted.`
      );
    } catch (error) {
      console.error("Error deleting product:", error);
      await createLog(
        "ERROR",
        req.session.user.username,
        `Failed to delete product with ID ${productId}.`
      );
      res.status(500).send("Server error");
    }
  }
);

// Route to find purchases by username
router.get(
  "/admin/find-purchases",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    const userName = req.query.userName;
    try {
      const logs = await Log.find({}).sort({ Date: -1 });
      const users = await User.find({});
      const products = await Product.find({});
      const purchases = await Purchase.find({ userName: userName });
      const coupons = await Coupon.find({}).sort({ expireDate: 1 });

      res.render("admin", {
        users,
        products,
        purchases,
        coupons,
        logs,
        tab: "purchases", // Ensure the purchases tab is active
        filters: {},
        username: req.session.user ? req.session.user.username : null, // Pass the username
        isAdmin: req.session.user && req.session.user.role === "admin", // Pass isAdmin
      });

      await createLog(
        "INFO",
        req.session.user.username,
        `Purchases retrieved for user ${userName}.`
      );
    } catch (error) {
      console.error("Error finding purchases:", error);
      await createLog(
        "ERROR",
        req.session.user.username,
        `Failed to find purchases for user ${userName}.`
      );
      res.status(500).send("Server Error");
    }
  }
);

// Purchase data route for charts
router.get("/admin/purchase-data", ensureAuthenticated, async (req, res) => {
  const { range } = req.query;
  let startDate;

  switch (range) {
    case "24h":
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "1m":
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    case "5y":
      startDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(0); // Get all data
      break;
  }

  try {
    const purchases = await Purchase.aggregate([
      {
        $addFields: {
          Date: { $toDate: "$Date" }, // Convert string date to Date object
        },
      },
      { $match: { Date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$Date" } },
          totalAmount: { $sum: "$TotalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedData = purchases.map((p) => ({
      date: p._id,
      amount: p.totalAmount,
    }));

    res.json(formattedData);
    await createLog(
      "INFO",
      req.session.user.username,
      `Purchase data retrieved for range ${range}.`
    );
  } catch (err) {
    console.error("Error fetching purchase data:", err);
    await createLog(
      "ERROR",
      req.session.user.username,
      "Failed to fetch purchase data."
    );
    res.status(500).json({ error: "Error fetching purchase data" });
  }
});

// Add coupon route
router.post(
  "/admin/add-coupon",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    const { code, discountPercentage, expireDate } = req.body;

    try {
      const newCoupon = new Coupon({
        code,
        discountPercentage,
        expireDate,
      });

      await newCoupon.save();
      res.redirect("/admin");
      await createLog(
        "INFO",
        req.session.user.username,
        `New coupon ${code} added.`
      );
    } catch (error) {
      console.error(error);
      await createLog(
        "ERROR",
        req.session.user.username,
        "Failed to add new coupon."
      );
      res.status(500).send("Failed to add coupon");
    }
  }
);

// Update coupon route
router.post(
  "/admin/update-coupon",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    const { id, code, discountPercentage, expireDate } = req.body;

    try {
      await Coupon.findByIdAndUpdate(id, {
        code,
        discountPercentage,
        expireDate,
      });
      res.redirect("/admin");
      await createLog(
        "INFO",
        req.session.user.username,
        `Coupon with ID ${id} updated.`
      );
    } catch (error) {
      console.error(error);
      await createLog(
        "ERROR",
        req.session.user.username,
        `Failed to update coupon with ID ${id}.`
      );
      res.status(500).send("Failed to update coupon");
    }
  }
);

// Delete coupon route
router.post(
  "/admin/delete-coupon",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    const { id } = req.body;

    try {
      await Coupon.findByIdAndDelete(id);
      res.redirect("/admin");
      await createLog(
        "INFO",
        req.session.user.username,
        `Coupon with ID ${id} deleted.`
      );
    } catch (error) {
      console.error(error);
      await createLog(
        "ERROR",
        req.session.user.username,
        `Failed to delete coupon with ID ${id}.`
      );
      res.status(500).send("Failed to delete coupon");
    }
  }
);

router.get("/admin/logs", ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, date, type, username, message } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (date) {
      const dateStart = new Date(date);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      query.Date = { $gte: dateStart, $lte: dateEnd };
    }
    if (type) query.type = type;
    if (username) query.username = new RegExp(username, "i");
    if (message) query.message = new RegExp(message, "i");

    const logs = await Log.find(query)
      .sort({ Date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalLogs = await Log.countDocuments(query);

    res.json({
      logs,
      totalLogs,
      totalPages: Math.ceil(totalLogs / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Error fetching logs" });
  }
});

router.get(
  "/admin/filter-users",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    const { username, email, phone, city, country, role } = req.query;

    let query = {};

    if (username) query.username = new RegExp(username, "i"); // Case-insensitive search
    if (email) query.email = new RegExp(email, "i");
    if (phone) query.phone = new RegExp(phone, "i");
    if (city) query.city = new RegExp(city, "i");
    if (country) query.country = new RegExp(country, "i");
    if (role) query.role = role;

    try {
      const logs = await Log.find({}).sort({ Date: -1 });
      const users = await User.find(query);
      const products = await Product.find({});
      const coupons = await Coupon.find({});
      const purchases = await Purchase.find({});

      res.render("admin", {
        users,
        products,
        coupons,
        purchases,
        logs,
        tab: "users",
        filters: req.query,
        username: req.session.user ? req.session.user.username : null, // Pass the username
        isAdmin: req.session.user && req.session.user.role === "admin", // Pass isAdmin
      });
    } catch (error) {
      console.error("Error filtering users:", error);
      res.status(500).send("Server Error");
    }
  }
);

router.get(
  "/admin/filter-products",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    const { prodId, name, price, category, company, gender, amount } =
      req.query;

    let query = {};

    if (prodId) query.prodId = new RegExp(prodId, "i");
    if (name) query.name = new RegExp(name, "i");
    if (price) query.price = price;
    if (category) query.category = category;
    if (company) query.company = new RegExp(company, "i");
    if (gender) query.gender = gender;
    if (amount) query.amount = amount;

    try {
      const logs = await Log.find({}).sort({ Date: -1 });
      const users = await User.find({});
      const products = await Product.find(query);
      const purchases = await Purchase.find({});
      const coupons = await Coupon.find({});

      res.render("admin", {
        users,
        products,
        purchases,
        coupons,
        logs,
        tab: "products",
        filters: req.query,
        username: req.session.user ? req.session.user.username : null, // Pass the username
        isAdmin: req.session.user && req.session.user.role === "admin", // Pass isAdmin
      });
    } catch (error) {
      console.error("Error filtering products:", error);
      res.status(500).send("Server Error");
    }
  }
);

router.get(
  "/admin/filter-coupons",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    const { code, discountPercentage } = req.query;

    let query = {};

    if (code) query.code = new RegExp(code, "i"); // case-insensitive match
    if (discountPercentage) query.discountPercentage = discountPercentage;

    try {
      const logs = await Log.find({}).sort({ Date: -1 });
      const users = await User.find({});
      const products = await Product.find({});
      const purchases = await Purchase.find({});
      const coupons = await Coupon.find(query); // Filtered coupons

      res.render("admin", {
        users,
        products,
        purchases,
        coupons,
        logs,
        tab: "coupons",
        filters: req.query,
        username: req.session.user ? req.session.user.username : null, // Pass the username
        isAdmin: req.session.user && req.session.user.role === "admin", // Pass isAdmin
      });
    } catch (error) {
      console.error("Error filtering coupons:", error);
      res.status(500).send("Server Error");
    }
  }
);

router.get(
  "/admin/filter-logs",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    const { date, type, username, message } = req.query;

    let query = {};

    if (date) {
      const dateStart = new Date(date);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999); // End of the day
      query.Date = { $gte: dateStart, $lte: dateEnd }; // Filter logs by date range
    }
    if (type) query.type = type; // Match type (INFO, ERROR, etc.)
    if (username) query.username = new RegExp(username, "i"); // Case-insensitive match
    if (message) query.message = new RegExp(message, "i"); // Case-insensitive match

    try {
      const logs = await Log.find(query).sort({ Date: -1 }); // Sort by date in descending order

      const users = await User.find({});
      const products = await Product.find({});
      const purchases = await Purchase.find({});
      const coupons = await Coupon.find({});

      res.render("admin", {
        users,
        products,
        purchases,
        coupons,
        logs,
        tab: "logs",
        filters: req.query,
        username: req.session.user ? req.session.user.username : null, // Pass the username
        isAdmin: req.session.user && req.session.user.role === "admin", // Pass isAdmin
      });
    } catch (error) {
      console.error("Error filtering logs:", error);
      res.status(500).send("Server Error");
    }
  }
);

// Add the multer middleware to handle image uploads
router.post("/admin/post-tweet", upload.single("image"), postTweet);

module.exports = router;
