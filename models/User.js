const mongoose = require("mongoose");
const { purchaseSchema } = require("./Purchase"); // Correctly import purchaseSchema
const bcrypt = require("bcrypt");

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
    default: "",
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

// Hash the password before saving the user model
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next(); // Only hash the password if it has been modified (or is new)
  }

  try {
    const salt = await bcrypt.genSalt(10); // Generate salt with cost factor 10
    this.password = await bcrypt.hash(this.password, salt); // Hash the password with the salt
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare input password with hashed password in the database
userSchema.methods.comparePassword = async function (candidatePassword) {
  console.log(candidatePassword, this.password);
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema, "users");

module.exports = User;
