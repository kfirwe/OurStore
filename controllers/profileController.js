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

// Example route using the middleware
router.get("/profile", ensureAuthenticated, async (req, res) => {
    try {
      // Fetch the current user's username
      const username = req.session.user ? req.session.user.username : "";
      if (!username){
        await createLog("INFO", username, "User feth attempt failed. User not found");
        return res
            .status(404)
            .json({message: "User data fetch failed. Invalid username or password."})
      }

      // Fetch user with username
      const user = await User.findOne({ username })
      if (!user){
        await createLog("INFO", username, "User fetch attempt Failed. User not found");
        return res
          .status(404)
          .json({ message: "User data fetch failed. Invalid username or password." });
      }

      // Set number of orders made by user
      const userPurchases = user.purchaseHistory;
      let lastpurchase = null;
      let lastpurchaseItemsCount = null;
      let purchasesCount = 0;

      // If user has made an order set number of orders and get latest order details
      if (userPurchases && userPurchases.length > 0){
        purchasesCount = userPurchases.length;
        lastpurchase = userPurchases.sort((a, b) => new Date(b.Date) - new Date(a.Date))[0];
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
        cartItemCount // Number of distinct items in the cart  for NavBar
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