const { Wishlist } = require("../models/Wishlist");
const { Product } = require("../models/Product");
const express = require("express");
const router = express.Router();

// Add or remove item from wishlist
async function toggleWishlist(req, res) {
  try {
    const { prodId } = req.body;
    const username = req.session.user.username;

    // Find the user's wishlist
    let wishlist = await Wishlist.findOne({ userName: username });

    if (!wishlist) {
      // If no wishlist exists for the user, create a new one
      wishlist = new Wishlist({ userName: username, products: [] });
    }

    // Check if the product is already in the wishlist
    const productIndex = wishlist.products.findIndex(
      (p) => p.prodId === prodId
    );

    if (productIndex === -1) {
      // If not in the wishlist, add it
      wishlist.products.push({ prodId }); // Push the UUID directly
      await wishlist.save();
      res.json({ success: true, message: "Product added to wishlist." });
    } else {
      // If already in the wishlist, remove it
      wishlist.products.splice(productIndex, 1); // Remove the product
      await wishlist.save();
      res.json({ success: true, message: "Product removed from wishlist." });
    }
  } catch (err) {
    console.error("Error toggling wishlist:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
}

// Get user's wishlist
async function getWishlist(req, res) {
  try {
    const wishlist = await Wishlist.findOne({
      userId: req.session.user._id,
    }).populate("products");
    res.json({ success: true, wishlist });
  } catch (err) {
    console.error("Error fetching wishlist:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}

router.post("/toggle-wishlist", toggleWishlist); // Add or remove item from wishlist
router.get("/wishlist", getWishlist); // For fetching wishlist items

module.exports = router;
