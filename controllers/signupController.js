const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Import the User model

// Handle user registration
router.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken." });
    }

    // Create a new user with "customer" role
    const newUser = new User({
      username,
      password,
      role: "customer", // Explicitly set the role to "customer"
    });

    await newUser.save();
    res.status(201).json({ message: "Sign up successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

module.exports = router;
