const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Assuming you have a User model

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username and password
    const user = await User.findOne({ username, password });

    if (!user) {
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

    // Redirect to the homepage or send a success response
    res
      .status(200)
      .json({ message: "Login successful", isAdmin, redirectUrl: "/homePage" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "An error occurred during login." });
  }
});

module.exports = router;
