// This file handles password reset HTTP requests

const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const User = require("../models/User");
const { sendPasswordResetEmail } = require("../helpers/nodemailer");
const {
  storeToken,
  verifyToken,
  deleteToken,
  hashPassword,
} = require("../helpers/tokenStore");

// Route for a GET request to render the forgot password page
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password"); 
});

// Route for a GET request to render the reset password form
router.get("/reset-password/:token", (req, res) => {
  const { token } = req.params;
  const { email, username } = req.query;

  if (!email) {
    return res.status(400).send("Email is required");
  }

  // Render the reset password page, passing the token and email to the form
  res.render("reset-password", { token, email, username });
});

// Route for a POST request to send an email to reset password 
router.post("/forgot-password", async (req, res) => {
  const { email, username } = req.body;

  try {
    // Find the user by both username and email
    const user = await User.findOne({ email, username });
    if (!user) {
      return res.status(404).json({
        message: "No account found with that email and username combination.",
      });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store the token with an expiry time (1 hour)
    storeToken(user.email, resetToken, 3600000); // Store token for 1 hour

    // Send the password reset email (include both username and token)
    await sendPasswordResetEmail(user.email, resetToken, user.username); // Pass both username and token
    res.json({ message: "Password reset email has been sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Route for a POST request to reset password
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { email, username, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    // Verify the token using email and token
    const validToken = verifyToken(email, token);
    if (!validToken) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Find the user by both email and username
    const user = await User.findOne({ email, username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's password (no need to hash here, it is handled by pre-save middleware)
    user.password = password;
    await user.save();

    // Delete the token once it's used
    deleteToken(email);

    // Send success response
    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
