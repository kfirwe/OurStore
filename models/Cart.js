const mongoose = require("mongoose");
const { productSchema } = require("./Product");

// Extend the product schema to include a quantity field
const cartProductSchema = new mongoose.Schema({
  ...productSchema.obj,
  quantity: { type: Number, required: true, default: 1 }, // Default quantity to 1
});

const cartSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true, // Each user should have one cart
  },
  products: [cartProductSchema], // Array of products in the cart
});

const Cart = mongoose.model("Cart", cartSchema, "carts");

module.exports = { Cart, cartSchema };
