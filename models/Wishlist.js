// models/Wishlist.js
const mongoose = require("mongoose");

const wishlistProductSchema = new mongoose.Schema(
  {
    prodId: { type: String, required: true }, // Store UUID as a string
  },
  { _id: false }
); // Disable the automatic _id for this subdocument

const wishlistSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true },
  products: [wishlistProductSchema], // Array of wishlist products
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

module.exports = { Wishlist };
