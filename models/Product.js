const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  prodId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  company: { type: String, required: true },
  gender: { type: String, required: true },
  image: { type: Buffer, required: true }, // Store image as binary data
  imageType: { type: String, required: true }, // Store the image MIME type
});

const Product = mongoose.model("Product", productSchema, "products");
module.exports = { Product, productSchema };
