// This file handles HTTP requests to signup

const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Import the User model
const createLog = require("../helpers/logHelper"); // Import the log helper

// Route for a POST to handle user registration
router.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      await createLog(
        "ERROR",
        username,
        "Signup failed. Username already taken."
      );
      return res.status(400).json({ message: "Username already taken." });
    }

    // Create a new user with default values
    const newUser = new User({
      username,
      password,
      email,
      phone: "", // Default empty string
      purchaseHistory: [], // Default empty array
      city: "", // Default empty string
      country: "", // Default empty string
      role: "customer", // Default role
    });

    await newUser.save();
    await createLog("INFO", username, "Signup successful.");
    res.status(201).json({ message: "Sign up successful!" });
  } catch (error) {
    console.error(error);
    await createLog("ERROR", username, "Server error during signup.");
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

module.exports = router;
