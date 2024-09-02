// models/Coupon.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
    expireDate: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
