const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const purchaseProductSchema = new mongoose.Schema({
  prodId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  company: { type: String, required: true },
  gender: { type: String, required: true },
  amount: { type: Number, required: true }, // Store the amount in stock
  quantityPurchased: { type: Number, required: true }, // Store the quantity purchased
  image: { type: Buffer, required: true }, // Store image as binary data
  imageType: { type: String, required: true }, // Store the image MIME type
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
