const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { productSchema } = require("./Product");

const purchaseSchema = new mongoose.Schema({
  purchaseId: {
    type: String,
    default: uuidv4, // Automatically generates a UUID for each purchase
    unique: true,
  },
  productsInfo: [productSchema],
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
