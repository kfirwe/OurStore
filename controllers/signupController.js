const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User"); // Import the User model

// Handle user registration
router.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  // Check if the user already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: "Username already taken." });
  }

  // Create a new user
  const newUser = new User({ username, password });

  try {
    await newUser.save();
    res.status(201).json({ message: "Sign up successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

module.exports = router;
