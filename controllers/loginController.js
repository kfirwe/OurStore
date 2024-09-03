const express = require("express");
const router = express.Router();
const User = require("../models/User");
const createLog = require("../helpers/logHelper"); // Import the log helper

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username and password
    const user = await User.findOne({ username, password });

    if (!user) {
      await createLog("INFO", username, "Failed login attempt.");
      return res
        .status(401)
        .json({ message: "Login failed. Invalid username or password." });
    }

    // Check if the user is an admin
    const isAdmin = user.role === "admin";

    req.session.user = {
      id: user._id,
      username: user.username,
      role: user.role, // Store the role
    };

    await createLog("INFO", user.username, "Login successful.");

    // Redirect to the homepage or send a success response
    res
      .status(200)
      .json({ message: "Login successful", isAdmin, redirectUrl: "/homePage" });
  } catch (error) {
    console.error("Login error:", error);
    await createLog("ERROR", username, "An error occurred during login.");
    res.status(500).json({ message: "An error occurred during login." });
  }
});

module.exports = router;
