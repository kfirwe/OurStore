const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { ensureAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const { Cart } = require("../models/Cart"); // Assuming you have a Cart model
const { Product } = require("../models/Product");
const { Purchase } = require("../models/Purchase");
const Coupon = require("../models/Coupon");
const addToCart = require("../helpers/adminHelper");
const createLog = require("../helpers/logHelper");
const { Log } = require("../models/Log");

// Example route using the middleware
router.get("/profile", ensureAuthenticated, async (req, res) => {
  try {
    // Fetch the current user's username
    const username = req.session.user ? req.session.user.username : "";
    if (!username) {
      await createLog(
        "INFO",
        username,
        `User feth attempt failed. ${req.session.user} User not found`
      );
      return res.status(404).json({
        message: `1. User data fetch failed. ${req.session.user} Invalid username or password.`,
      });
    }

    // Fetch user with username
    const user = await User.findOne({ username });
    if (!user) {
      await createLog(
        "INFO",
        username,
        `User fetch attempt Failed. User ${username} not found`
      );
      return res.status(404).json({
        message: `2. User data fetch failed. ${username} Invalid username or password.`,
      });
    }

    // Set number of orders made by user
    const userPurchases = user.purchaseHistory;
    let lastpurchase = null;
    let lastpurchaseItemsCount = null;
    let purchasesCount = 0;

    // If user has made an order set number of orders and get latest order details
    if (userPurchases && userPurchases.length > 0) {
      purchasesCount = userPurchases.length;
      lastpurchase = userPurchases.sort(
        (a, b) => new Date(b.Date) - new Date(a.Date)
      )[0];
      lastpurchaseItemsCount = lastpurchase.productsInfo.length;
    }

    // Fetch the cart for the current user
    let cartItemCount = 0;
    if (username) {
      const cart = await Cart.findOne({ userName: username });
      if (cart) {
        cartItemCount = cart.products.length; // Count the number of distinct items in the cart
      }
    }

    res.render("profile", {
      isAdmin: req.session.user ? req.session.user.role === "admin" : false, // Check if the user is an admin - for NavBar
      username,
      user,
      purchasesCount,
      lastpurchase,
      lastpurchaseItemsCount,
      cartItemCount, // Number of distinct items in the cart  for NavBar
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Update user Info route
router.post("/profile/update-user", ensureAuthenticated, async (req, res) => {
  try {
    // Get vars from the request body
    const { email, phone, city, country } = req.body;
    const userId = req.session.user.id;

    if (userId) {
      const newUser = await User.findByIdAndUpdate(userId, {
        email,
        phone,
        city,
        country,
      });

      res.status(200).json(`User with ID ${userId} updated. to ${newUser}`);

      await createLog(
        "INFO",
        req.session.user.username,
        `User with ID ${userId} updated. to ${newUser}.`
      );
    } else {
      return res.status(400).send("Invalid User ID");
    }
  } catch (error) {
    console.error(error);
    await createLog(
      "ERROR",
      req.session.user.username,
      `Failed to update user with ID ${userId}.`
    );
    res.status(500).send("Server error");
  }
});

//Route for updating user password
router.post(
  "/profile/update-password",
  ensureAuthenticated,
  async (req, res) => {
    try {
      // Get vars from the request body
      const { currentPassword, newPassword } = req.body;
      const username = req.session.user ? req.session.user.username : "";

      // Fetch user with username
      const user = await User.findOne({ username });

      if (!user) {
        return res.status(404).send("User not found");
      }

      const correctPassword = await user.comparePassword(currentPassword);
      console.debug(`Password validation ${correctPassword}`);
      if (!correctPassword) {
        console.debug("in the if");
        return res.status(400).send("Current password entered is incorrect");
      }

      // Update user password
      user.password = newPassword;
      await user.save();

      res.status(200).json(`Password for User ${username} updated.`);

      await createLog(
        "INFO",
        req.session.user.username,
        `Password for User updated.`
      );
    } catch (error) {
      console.error(error);
      await createLog(
        "ERROR",
        req.session.user.username,
        `Failed to update password for user.`
      );

      res.status(500).send("Server error");
    }
  }
);

// Example route using the middleware
router.get(
  "/profile/purchase-history",
  ensureAuthenticated,
  async (req, res) => {
    try {
      // Fetch the current user's username
      const username = req.session.user ? req.session.user.username : "";
      if (!username) {
        await createLog(
          "INFO",
          username,
          "User feth attempt failed. User not found"
        );
        return res.status(404).json({
          message: "User data fetch failed. Invalid username or password.",
        });
      }

      // Fetch user with username
      const user = await User.findOne({ username });
      if (!user) {
        await createLog(
          "INFO",
          username,
          "User fetch attempt Failed. User not found"
        );
        return res.status(404).json({
          message: "User data fetch failed. Invalid username or password.",
        });
      }

      // Set number of orders made by user
      const userPurchases = user.purchaseHistory;
      let purchasesCount = 0;

      // If user has made an order set number of orders and get latest order details
      if (userPurchases && userPurchases.length > 0) {
        purchasesCount = userPurchases.length;
      }

      // Fetch the cart for the current user
      let cartItemCount = 0;
      if (username) {
        const cart = await Cart.findOne({ userName: username });
        if (cart) {
          cartItemCount = cart.products.length; // Count the number of distinct items in the cart
        }
      }

      res.render("orderHistory", {
        isAdmin: req.session.user ? req.session.user.role === "admin" : false, // Check if the user is an admin - for NavBar
        username,
        user,
        userPurchases,
        purchasesCount,
        cartItemCount, // Number of distinct items in the cart  for NavBar
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  }
);

// Purchase data route for charts
// Purchase data route for charts
router.get("/profile/purchase-data", ensureAuthenticated, async (req, res) => {
  const username = req.session.user ? req.session.user.username : "";
  const { range } = req.query;
  let endDate = new Date();
  let startDate;

  if (range === "last24h") {
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 1);
  } else if (range === "lastWeek") {
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 7);
  } else if (range === "lastMonth") {
    startDate = new Date(endDate);
    startDate.setMonth(endDate.getMonth() - 1);
  } else if (range == "lastYear") {
    startDate = new Date(endDate);
    startDate.setFullYear(endDate.getFullYear() - 1);
  } else if (range == "last5Years") {
    startDate = new Date(endDate);
    startDate.setFullYear(endDate.getFullYear() - 5);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  try {
    const user = await User.findOne({ username }).populate(
      "purchaseHistory.productsInfo"
    );
    if (!user) {
      return res.status(404).send("User not found");
    }

    const spendingByDesigner = user.purchaseHistory.reduce((acc, purchase) => {
      const purchaseDate = new Date(purchase.Date);

      if (purchaseDate >= startDate && purchaseDate <= endDate) {
        purchase.productsInfo.forEach((product) => {
          if (!acc[product.company]) {
            acc[product.company] = 0;
          }
          acc[product.company] += product.price;
        });
      }
      return acc;
    }, {});

    console.log("Spending By Designer:", spendingByDesigner); // Debugging output

    if (Object.keys(spendingByDesigner).length === 0) {
      return res.json({});
    }

    res.json(spendingByDesigner);
    await createLog(
      "INFO",
      req.session.user.username,
      `Purchase data retrieved for range: ${range}.`
    );
  } catch (error) {
    console.error("Error retrieving purchase data:", error);
    res.status(500).send("Server error");
  }
});

module.exports = router;
