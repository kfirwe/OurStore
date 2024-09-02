const express = require("express");
const router = express.Router();

// Logout route
router.get("/logout", (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("An error occurred during logout");
    }

    // Redirect to login page after logout
    res.redirect("/");
  });
});

module.exports = router;
