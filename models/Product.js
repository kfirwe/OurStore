const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  prodId: String, // Unique identifier for the product
  name: String, // Product name
  price: Number, // Product price
  category: String, // Product category
  company: String, // Manufacturer or brand
  gender: String, // Target gender (e.g., "Male", "Female", "Unisex")
  image: String, // URL of the product image
});

// Explicitly define the collection name if needed
const Product = mongoose.model("Product", productSchema, "products");

module.exports = { Product, productSchema };
