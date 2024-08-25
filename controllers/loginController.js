const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User"); // Import the User model

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username and password
    const user = await User.findOne({ username: username, password: password });

    if (user) {
      // If user exists and credentials match
      res.status(200).json({ message: "Login successful" });
    } else {
      // If user does not exist or credentials do not match
      res
        .status(401)
        .json({ message: "Login failed. Invalid username or password." });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

module.exports = router;
