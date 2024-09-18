const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { productSchema } = require("./Product");

const productInPurchaseSchema = new mongoose.Schema({
  prodId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  company: { type: String, required: true },
  gender: { type: String, required: true },
  color: { type: String, required: true },
  size: { type: String, required: true },
  image: { type: Buffer, required: true }, // Store image as binary data
  imageType: { type: String, required: true }, // Store the image MIME type
});

// Add a compound index for prodId, color, and size
productInPurchaseSchema.index(
  { prodId: 1, color: 1, size: 1 },
  { unique: true }
);

// Extend the product schema with quantityPurchased field
const purchaseProductSchema = new mongoose.Schema({
  ...productInPurchaseSchema.obj, // Spread the fields of the product schema
  quantityPurchased: { type: Number, required: true, default: 1 }, // Add the quantityPurchased field
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

module.exports = { Purchase, purchaseSchema, productInPurchaseSchema };
