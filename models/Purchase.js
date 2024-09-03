const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { productSchema } = require("./Product");

// Extend the product schema with quantityPurchased field
const purchaseProductSchema = new mongoose.Schema({
  ...productSchema.obj, // Spread the fields of the product schema
  quantityPurchased: { type: Number, required: true }, // Add the quantityPurchased field
});

const purchaseSchema = new mongoose.Schema({
  purchaseId: {
    type: String,
    default: uuidv4, // Automatically generates a UUID for each purchase
    unique: true,
  },
  userName: {
    type: String,
    required: true, // Store the username directly
  },
  productsInfo: [purchaseProductSchema], // Use the new schema here
  TotalAmount: {
    type: Number,
    required: true,
  },
  Date: {
    type: Date,
    default: Date.now,
  },
});

const Purchase = mongoose.model("Purchase", purchaseSchema, "purchases");

module.exports = { Purchase, purchaseSchema };
