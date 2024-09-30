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

// Render the forgot password page (GET request)
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password"); // Make sure you have a `forgot-password.ejs` in the views folder
});

// GET route to render the reset password form
router.get("/reset-password/:token", (req, res) => {
  const { token } = req.params;

  // Render the reset password page, passing the token so it can be used in the form
  res.render("reset-password", { token });
});

// Forgot password route
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No account with that email exists." });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store the token and set an expiry time (1 hour)
    storeToken(user.email, resetToken, 3600000); // 1 hour in milliseconds

    // Send reset email
    await sendPasswordResetEmail(user.email, resetToken);
    res.json({ message: "Password reset email has been sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset password route
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match");
  }

  try {
    // Verify the token using email and token
    const validToken = verifyToken(email, token);
    if (!validToken) {
      return res.status(400).send("Invalid or expired token");
    }

    // Find the user based on the email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Update the user's password (hash it before saving)
    user.password = await hashPassword(password); // Use your existing password hashing method
    await user.save();

    // Delete the token once it's used
    deleteToken(email);

    // Redirect or show success message
    res.send(
      "Password reset successful! You can now login with your new password."
    );
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).send("Server error");
  }
});

module.exports = router;
