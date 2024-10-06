// This files handles the http requests made to the routes prefixed by /admin

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
const Discount = require("../models/Discount");
const mapToObject = require("../helpers/homepageHelper");

// Set up multer for file upload
const storage = multer.memoryStorage(); // Store files in memory, not on disk
const upload = multer({ storage: storage });

// Valid sizes allowed
const validSizes = ["S", "M", "L", "XL", "XXL"];

// route for GET http request to view admin page
router.get("/admin", ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    // Fetch discounts
    const discounts = await Discount.find();

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

    const productsWithColors = products.map((product) => {
      // Convert Map to a plain object before sending to the EJS template
      const colorsObject = mapToObject(product.colors);

      return {
        ...product.toObject(), // Convert the Mongoose document to a plain object
        colors: colorsObject, // Replace the colors Map with the converted plain object
      };
    });

    res.render("admin", {
      users,
      products: productsWithColors,
      purchases,
      discounts,
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

// Route for handling POST http request to Delete user 
router.post(
  "/admin/delete-user",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    try {

      // Receive user ID from request body
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

// Route for handling POST http request to update a field for User, Product, or Coupon
router.post(
  "/admin/update-field",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    let { id, field, value } = req.body;

    if (typeof value === "string") {
      value = value.trim();
    }

    try {
      // Update User fields
      if (
        field === "username" ||
        field === "email" ||
        field === "phone" ||
        field === "city" ||
        field === "country" ||
        field === "role"
      ) {
        await User.findByIdAndUpdate(id, { [field]: value });
      }
      // Update Coupon fields
      else if (
        field === "code" ||
        field === "discountPercentage" ||
        field === "expireDate"
      ) {
        await Coupon.findByIdAndUpdate(id, { [field]: value });
      }
      // Update Product fields
      else if (
        field === "name" ||
        field === "price" ||
        field === "category" ||
        field === "company" ||
        field === "gender" ||
        field === "amount"
      ) {
        await Product.findByIdAndUpdate(id, { [field]: value });
      }
      // Update Discount fields
      else if (
        field === "DiscountPercentage" ||
        field === "validFrom" ||
        field === "validUntil"
      ) {
        // Validate numeric range for discountPercentage
        if (field === "DiscountPercentage") {
          const percentage = parseInt(value, 10);
          if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            return res
              .status(400)
              .send("Discount percentage must be between 0 and 100.");
          }
          field = "discountPercentage";
          value = percentage;
        }

        // Validate and update dates for validFrom and validUntil
        if (field === "validFrom" || field === "validUntil") {
          const newDate = new Date(value);
          if (isNaN(newDate.getTime())) {
            return res.status(400).send("Please enter a valid date.");
          }
          value = newDate;
        }

        await Discount.findByIdAndUpdate(id, { [field]: value });
      } else {
        return res.status(400).send("Invalid field");
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

// Route for a POST request to update a user
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

// Route for a POST request to add a user
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

// Route for a POST request to add a product with values from the request's body
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
      colors: {},
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

// Route for a POST request to update a product information
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

// Route for a POST request to update product's image
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

// Route for a POST request to handle product deletion by ID
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

// Route for a GET request to fetch purchases by username
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

      // Fetch discounts
      const discounts = await Discount.find();

      // Fetch the cart for the current user
      let cartItemCount = 0;
      if (req.session.user?.username) {
        const cart = await Cart.findOne({
          userName: req.session.user.username,
        });
        if (cart) {
          cartItemCount = cart.products.length; // Count the number of distinct items in the cart
        }
      }

      const productsWithColors = products.map((product) => {
        // Convert Map to a plain object before sending to the EJS template
        const colorsObject = mapToObject(product.colors);

        return {
          ...product.toObject(), // Convert the Mongoose document to a plain object
          colors: colorsObject, // Replace the colors Map with the converted plain object
        };
      });

      res.render("admin", {
        users,
        products: productsWithColors,
        discounts,
        purchases,
        cartItemCount,
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

// Route for a GET requet to fetch purchase data to fill charts by selected range
router.get("/admin/purchase-data", ensureAuthenticated, async (req, res) => {
  const { range } = req.query;
  let startDate;

  // Determine the start date based on the selected range
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
      startDate = new Date(0); // Get all data if no range is provided
      break;
  }

  try {
    const purchases = await Purchase.aggregate([
      // Ensure the `Date` field is properly converted to Date type
      {
        $addFields: {
          Date: { $toDate: "$Date" }, // Convert the string date to a proper Date object
        },
      },
      {
        // Filter the purchases by the start date
        $match: { Date: { $gte: startDate } },
      },
      {
        // Group by the date, summing the total amount and collecting usernames
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$Date" } },
          totalAmount: { $sum: "$TotalAmount" },
          users: { $addToSet: "$userName" }, // Collect distinct usernames
        },
      },
      {
        // Sort by date ascending
        $sort: { _id: 1 },
      },
    ]);

    // Format the aggregated data for the response
    const formattedData = purchases.map((p) => ({
      date: p._id,
      amount: p.totalAmount,
      username: p.users.join(", "), // Combine multiple usernames into a string for display
    }));

    // Send the formatted data back as JSON
    res.json(formattedData);

    // Log the success action
    await createLog(
      "INFO",
      req.session.user.username,
      `Purchase data retrieved for range ${range}.`
    );
  } catch (err) {
    console.error("Error fetching purchase data:", err);

    // Log the error action
    await createLog(
      "ERROR",
      req.session.user.username,
      "Failed to fetch purchase data."
    );
    res.status(500).json({ error: "Error fetching purchase data" });
  }
});

// Route for a POST request to add a coupon
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

// Route for a POST request to update a coupon's values
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

// Route for a POST request to delete a coupon
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

// Route for a GET request to fetch system logs
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

// Route for GET request to fetch filtered users
router.get(
  "/admin/filter-users",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {

    // Get user filters from the request
    const { username, email, phone, city, country, role } = req.query;

    let query = {};

    // Create user filters with given values and search formatching users
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

      // Fetch discounts
      const discounts = await Discount.find();

      // Fetch the cart for the current user
      let cartItemCount = 0;
      if (req.session.user?.username) {
        const cart = await Cart.findOne({
          userName: req.session.user.username,
        });
        if (cart) {
          cartItemCount = cart.products.length; // Count the number of distinct items in the cart
        }
      }

      const productsWithColors = products.map((product) => {
        // Convert Map to a plain object before sending to the EJS template
        const colorsObject = mapToObject(product.colors);

        return {
          ...product.toObject(), // Convert the Mongoose document to a plain object
          colors: colorsObject, // Replace the colors Map with the converted plain object
        };
      });

      res.render("admin", {
        users,
        products: productsWithColors,
        discounts,
        coupons,
        cartItemCount,
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

// Route for a GET request to fetch filtered products
router.get(
  "/admin/filter-products",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {

    // Receive filter parameters from request
    const { prodId, name, price, category, company, gender, amount } =
      req.query;

    let query = {};

    // Create products filters and find matching products
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

      // Fetch discounts
      const discounts = await Discount.find();

      // Fetch the cart for the current user
      let cartItemCount = 0;
      if (req.session.user?.username) {
        const cart = await Cart.findOne({
          userName: req.session.user.username,
        });
        if (cart) {
          cartItemCount = cart.products.length; // Count the number of distinct items in the cart
        }
      }

      const productsWithColors = products.map((product) => {
        // Convert Map to a plain object before sending to the EJS template
        const colorsObject = mapToObject(product.colors);

        return {
          ...product.toObject(), // Convert the Mongoose document to a plain object
          colors: colorsObject, // Replace the colors Map with the converted plain object
        };
      });

      res.render("admin", {
        users,
        products: productsWithColors,
        discounts,
        purchases,
        cartItemCount,
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

// Route for a GET request to fetch filtered coupons
router.get(
  "/admin/filter-coupons",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    const { code, discountPercentage } = req.query;

    let query = {};

    // Create coupons filters and try to find matching coupons
    if (code) query.code = new RegExp(code, "i"); // case-insensitive match
    if (discountPercentage) query.discountPercentage = discountPercentage;

    try {
      const logs = await Log.find({}).sort({ Date: -1 });
      const users = await User.find({});
      const products = await Product.find({});
      const purchases = await Purchase.find({});
      const coupons = await Coupon.find(query); // Filtered coupons

      // Fetch discounts
      const discounts = await Discount.find();

      // Fetch the cart for the current user
      let cartItemCount = 0;
      if (req.session.user?.username) {
        const cart = await Cart.findOne({
          userName: req.session.user.username,
        });
        if (cart) {
          cartItemCount = cart.products.length; // Count the number of distinct items in the cart
        }
      }

      const productsWithColors = products.map((product) => {
        // Convert Map to a plain object before sending to the EJS template
        const colorsObject = mapToObject(product.colors);

        return {
          ...product.toObject(), // Convert the Mongoose document to a plain object
          colors: colorsObject, // Replace the colors Map with the converted plain object
        };
      });

      res.render("admin", {
        users,
        products: productsWithColors,
        discounts,
        cartItemCount,
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

// Route for a GET request to fetch filtered logs
router.get(
  "/admin/filter-logs",
  ensureAuthenticated,
  isAdmin,
  async (req, res) => {
    const { date, type, username, message } = req.query;

    let query = {};

    // Create logs filters and try to find matching logs
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

      // Fetch discounts
      const discounts = await Discount.find();

      // Fetch the cart for the current user
      let cartItemCount = 0;
      if (req.session.user?.username) {
        const cart = await Cart.findOne({
          userName: req.session.user.username,
        });
        if (cart) {
          cartItemCount = cart.products.length; // Count the number of distinct items in the cart
        }
      }

      const productsWithColors = products.map((product) => {
        // Convert Map to a plain object before sending to the EJS template
        const colorsObject = mapToObject(product.colors);

        return {
          ...product.toObject(), // Convert the Mongoose document to a plain object
          colors: colorsObject, // Replace the colors Map with the converted plain object
        };
      });

      res.render("admin", {
        users,
        products: productsWithColors,
        discounts,
        cartItemCount,
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

// Route for a POST request to add a new discount
router.post("/admin/add-discount", async (req, res) => {
  try {
    console.log(req.body);

    const { prodIds, discountPercentage, validFrom, validUntil } = req.body;

    // Ensure prodIds is properly parsed as an array
    let parsedProdIds;
    if (Array.isArray(prodIds)) {
      parsedProdIds = prodIds.map((id) => id.trim()); // Handle case where prodIds is already an array
    } else {
      parsedProdIds = prodIds.split(",").map((id) => id.trim()); // Split into array if it's a string
    }

    // Validate required fields
    if (parsedProdIds.length === 0) {
      throw new Error("At least one Product ID is required.");
    }
    if (
      !discountPercentage ||
      discountPercentage < 0 ||
      discountPercentage > 100
    ) {
      throw new Error("Discount percentage must be between 0 and 100.");
    }
    if (!validFrom || !validUntil) {
      throw new Error("Valid from and valid until dates are required.");
    }

    // Parse the dates into Date objects
    const parsedValidFrom = new Date(validFrom);
    const parsedValidUntil = new Date(validUntil);

    if (isNaN(parsedValidFrom.getTime()) || isNaN(parsedValidUntil.getTime())) {
      throw new Error("Invalid date format.");
    }

    // Create and save the new discount
    const newDiscount = new Discount({
      prodIds: parsedProdIds, // Store as an array of product IDs
      discountPercentage,
      validFrom: parsedValidFrom,
      validUntil: parsedValidUntil,
    });

    // Log the object before saving to ensure everything is correct
    console.log("Discount object to be saved:", newDiscount);

    await newDiscount.save();
    res.redirect("/admin?tab=discounts");
  } catch (err) {
    console.error("Error adding discount:", err.message); // Log the actual error
    res.status(500).send("Error adding discount: " + err.message); // Send the error message back for debugging
  }
});

// Route for a POST request to delete a discount
router.post("/admin/delete-discount", async (req, res) => {
  try {
    const { id } = req.body;

    // Delete the discount by ID
    await Discount.findByIdAndDelete(id);

    res.redirect("/admin?tab=discounts"); // Redirect back to the discounts tab after deletion
  } catch (err) {
    console.error("Error deleting discount:", err);
    res.status(500).send("Server Error");
  }
});

// Route for a GET request to fetch filtered discounts based on discount precentage
router.get("/admin/filter-discounts", async (req, res) => {
  try {
    const { discountPercentage } = req.query;
    const filters = {};

    // Apply discountPercentage filter if provided
    if (discountPercentage) {
      filters.discountPercentage = parseInt(discountPercentage, 10); // Ensure it's an integer
    }

    // Fetch discounts based on the filters
    const discounts = await Discount.find(filters);

    // Fetch other data needed for the admin page
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

    const productsWithColors = products.map((product) => {
      // Convert Map to a plain object before sending to the EJS template
      const colorsObject = mapToObject(product.colors);

      return {
        ...product.toObject(), // Convert the Mongoose document to a plain object
        colors: colorsObject, // Replace the colors Map with the converted plain object
      };
    });

    // Render the admin page with the filtered discounts
    res.render("admin", {
      users,
      products: productsWithColors,
      purchases,
      discounts,
      coupons,
      cartItemCount,
      logs,
      tab: "discounts", // Pass the active tab to the view
      filters: req.query,
      username: req.session.user ? req.session.user.username : null, // Pass username from session or null
      isAdmin: req.session.user && req.session.user.role === "admin", // Check if user is admin
    });
  } catch (err) {
    console.error("Error filtering discounts:", err);
    res.status(500).send("Server Error");
  }
});

// Route for a POST request to update a product parameters by ID
router.post("/admin/update-color-size", async (req, res) => {
  const { productId, color, size, quantity } = req.body;
  try {
    await Product.updateOne(
      { _id: productId },
      { $set: { [`colors.${color}.${size}`]: quantity } }
    );
    res.sendStatus(200);
  } catch (error) {
    console.error("Error updating color size:", error);
    res.status(500).send("Server error");
  }
});

// Route for a POST request to add a new size to an existing product with a color
router.post("/admin/add-size", async (req, res) => {
  let { productId, color, newSize, newQuantity } = req.body;

  // Convert the color to lowercase and newSize to uppercase
  color = color.toLowerCase();
  newSize = newSize.toUpperCase();

  try {
    // Validate if the size is valid
    if (!validSizes.includes(newSize)) {
      return res
        .status(400)
        .send("Invalid size. Allowed sizes are: S, M, L, XL, XXL.");
    }

    // Fetch the product to check if the color and size already exist
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found.");
    }

    // Check if the color exists
    if (!product.colors.has(color)) {
      return res.status(400).send("Color does not exist.");
    }

    // Check if the size already exists under the color
    if (product.colors.get(color).hasOwnProperty(newSize)) {
      return res.status(400).send("Size already exists under this color.");
    }

    // Add the new size to the existing color
    await Product.updateOne(
      { _id: productId },
      { $set: { [`colors.${color}.${newSize}`]: newQuantity } }
    );

    res.sendStatus(200);
  } catch (error) {
    console.error("Error adding new size:", error);
    res.status(500).send("Server error");
  }
});

// Route for a POST request to delete a product's size
router.post("/admin/delete-size", async (req, res) => {
  const { productId, color, size } = req.body;
  try {
    await Product.updateOne(
      { _id: productId },
      { $unset: { [`colors.${color}.${size}`]: 1 } }
    );
    res.sendStatus(200);
  } catch (error) {
    console.error("Error deleting size:", error);
    res.status(500).send("Server error");
  }
});

// Route for a POST request to add a new color with a size and quantity
router.post("/admin/add-color", async (req, res) => {
  let { productId, newColor, newSize, newQuantity } = req.body;

  // Convert the newColor to lowercase and newSize to uppercase
  newColor = newColor.toLowerCase();
  newSize = newSize.toUpperCase();

  try {
    // Validate if the size is valid
    if (!validSizes.includes(newSize)) {
      return res
        .status(400)
        .send("Invalid size. Allowed sizes are: S, M, L, XL, XXL.");
    }

    // Fetch the product to check if the color already exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found.");
    }

    // Check if the color already exists
    if (product.colors.has(newColor)) {
      return res.status(400).send("Color already exists.");
    }

    // Add the new color with the specified size and quantity
    await Product.updateOne(
      { _id: productId },
      { $set: { [`colors.${newColor}`]: { [newSize]: newQuantity } } }
    );

    res.sendStatus(200);
  } catch (error) {
    console.error("Error adding new color:", error);
    res.status(500).send("Server error");
  }
});

// Route for a POST request to delete a product's color
router.post("/admin/delete-color", async (req, res) => {
  const { productId, color } = req.body;
  try {
    await Product.updateOne(
      { _id: productId },
      { $unset: { [`colors.${color}`]: 1 } }
    );
    res.sendStatus(200);
  } catch (error) {
    console.error("Error deleting color:", error);
    res.status(500).send("Server error");
  }
});

// Route for a POST request to use multer middleware for handling image uploads and post tweets
router.post("/admin/post-tweet", upload.single("image"), postTweet);

module.exports = router;
