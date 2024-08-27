const mongoose = require("mongoose");
const { purchaseSchema } = require("./Purchase"); // Correctly import purchaseSchema

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    default: "",
  },
  purchaseHistory: [purchaseSchema], // Embed the Purchase schema directly in the User model
  city: {
    type: String,
    default: "",
  },
  country: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    default: "customer",
  },
});

const User = mongoose.model("User", userSchema, "users");

module.exports = User;
