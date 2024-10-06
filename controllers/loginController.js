// This file handles HTTP requests made for the /login route

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const createLog = require("../helpers/logHelper"); // Import the log helper

// Route for a POST request to login to the system (by validating user information)
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username and password
    const user = await User.findOne({ username });

    if (!user) {
      await createLog("INFO", username, "Failed login attempt.");
      return res
        .status(401)
        .json({ message: "Login failed. Invalid username or password." });
    }

    // Check if the user is an admin
    const isAdmin = user.role === "admin";

    // Compare input password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await createLog("INFO", username, "Failed login attempt.");
      return res.status(401).json({ message: "Invalid credentials." });
    }

    req.session.user = {
      id: user._id,
      username: user.username,
      role: user.role, // Store the role
    };

    await createLog("INFO", user.username, "Login successful.");

    // Check if there are filters saved in the session from before login
    const previousFilters = req.session.previousFilters || {};

    // If no filters are saved, apply default gender=unisex filter
    if (!previousFilters.gender) {
      previousFilters.gender = "unisex";
    }

    // Construct the filter query string
    const filterQuery = new URLSearchParams(previousFilters).toString();

    // Redirect to homePage with the filter (either saved filters or default unisex filter)
    const redirectUrl = `/homePage?${filterQuery}`;

    // Clear the saved filters after redirection
    delete req.session.previousFilters;

    // Redirect to the homepage with or without filters
    res.status(200).json({
      message: "Login successful",
      isAdmin,
      redirectUrl, // Include the filters if available
    });
  } catch (error) {
    console.error("Login error:", error);
    await createLog("ERROR", username, "An error occurred during login.");
    res.status(500).json({ message: "An error occurred during login." });
  }
});

module.exports = router;
