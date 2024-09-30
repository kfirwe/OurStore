const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const { Cart } = require("../models/Cart"); // Assuming you have a Cart model
const createLog = require("../helpers/logHelper");

// Example route using the middleware
router.get("/about-us", ensureAuthenticated, async (req, res) => {
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
      
      // Fetch the cart for the current user
      let cartItemCount = 0;
      if (username) {
        const cart = await Cart.findOne({ userName: username });
        if (cart) {
          cartItemCount = cart.products.length; // Count the number of distinct items in the cart
        }
      }
  
      res.render("about", {
        isAdmin: req.session.user ? req.session.user.role === "admin" : false, // Check if the user is an admin - for NavBar
        username,
        user,
        cartItemCount // Number of distinct items in the cart  for NavBar
      }
  );
  
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  });

module.exports = router;