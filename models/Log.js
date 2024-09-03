const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  Date: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
});

const Log = mongoose.model("Log", logSchema, "logs");

module.exports = { Log };
