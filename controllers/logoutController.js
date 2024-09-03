const express = require("express");
const router = express.Router();
const createLog = require("../helpers/logHelper"); // Import the log helper

// Logout route
router.get("/logout", (req, res) => {
  const username = req.session.user
    ? req.session.user.username
    : "Unknown User"; // Retrieve the username if available

  // Destroy the session
  req.session.destroy(async (err) => {
    if (err) {
      console.error("Error destroying session:", err);
      await createLog("ERROR", username, "An error occurred during logout.");
      return res.status(500).send("An error occurred during logout");
    }

    await createLog("INFO", username, "Logout successful.");

    // Redirect to login page after logout
    res.redirect("/");
  });
});

module.exports = router;
