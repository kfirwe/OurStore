const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const discountSchema = new mongoose.Schema({
  prodIds: {
    type: [String], // Now this is correctly defined as an array of product IDs
    required: true,
  },
  discountPercentage: {
    type: Number,
    required: true,
  },
  validFrom: {
    type: Date,
    required: true,
  },
  validUntil: {
    type: Date,
    required: true,
  },
});

// Ensure there is no index on "prodId", only discountId is unique
const Discount = mongoose.model("Discount", discountSchema, "discounts");

module.exports = Discount;
