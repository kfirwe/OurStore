const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { ensureAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const { Product } = require("../models/Product");
const { Purchase } = require("../models/Purchase");
const Coupon = require("../models/Coupon");
const addToCart = require("../helpers/adminHelper");

// Example route using the middleware
router.get("/profile", ensureAuthenticated, async (req, res) => {
    try {
      // Fetch the current user's username
      const username = req.session.user ? req.session.user.username : "";

      // Fetch user with username
      const user = await User.findOne({ username })
      if (!username){
        await createLog("INFO", username, "User fetch attempt Failed. User not found");
        return res
          .status(404)
          .json({ message: "User data fetch failed. Invalid username or password." });
      }

      // Set number of orders made by user
      const userPurchases = user.purchaseHistory;
      let orderCount = 0;
      let lastpurchase = null;
      let lastpurchaseItemsCount = null;

      // If user has made an order set number of orders and get latest order details
      if (userPurchases){
        const purchasesCount = userPurchases.length;
        const lastpurchase = userPurchases.sort({ Date: -1 })[0];
        const lastpurchaseItemsCount = lastpurchase.length;
      }
  
      res.render("profile", {
        username,
        user,
        purchasesCount,
        lastpurchase,
        lastpurchaseItemsCount,
        tab // Pass the active tab to the view
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  });

// Update user Info route
router.post(
  "/profile/update-user",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { userId, username, email, phone, adress } = req.body;
      await User.findByIdAndUpdate(userId, {
        username,
        email,
        phone,
        adress
      });
      res.redirect("/profile");
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


module.exports = router;