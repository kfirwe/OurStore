const tokens = {};

const storeToken = (email, token, expiry) => {
  tokens[email] = { token, expiry: Date.now() + expiry };
};

const verifyToken = (email, token) => {
  if (!tokens[email] || tokens[email].token !== token) {
    return false;
  }
  if (Date.now() > tokens[email].expiry) {
    delete tokens[email]; // Remove expired token
    return false;
  }
  return true;
};

const deleteToken = (email) => {
  delete tokens[email];
};

const hashPassword = async (password) => {
  // Assume you're using bcrypt or any other hashing function
  const bcrypt = require("bcrypt");
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

module.exports = { storeToken, verifyToken, deleteToken, hashPassword };

// const bcrypt = require("bcrypt");
// const User = require("../models/User");

// // Example of verifying a reset token (you may store these tokens in a database or in-memory)
// async function verifyPasswordResetToken(token) {
//   // Find the user by reset token in your database
//   const user = await User.findOne({
//     resetPasswordToken: token,
//     resetPasswordTokenExpires: { $gt: Date.now() },
//   });
//   return user;
// }

// // Example of hashing the password
// async function hashPassword(password) {
//   const salt = await bcrypt.genSalt(10);
//   const hashedPassword = await bcrypt.hash(password, salt);
//   return hashedPassword;
// }

// const tokens = {}; // In-memory token store

// const storeToken = (email, token, expiryTime) => {
//   tokens[email] = { token, expiry: Date.now() + expiryTime };
// };

// const verifyToken = (email, token) => {
//   if (!tokens[email] || tokens[email].token !== token) {
//     return false;
//   }
//   if (Date.now() > tokens[email].expiry) {
//     delete tokens[email]; // Remove expired token
//     return false;
//   }
//   return true;
// };

// const deleteToken = (email) => {
//   delete tokens[email];
// };

// module.exports = {
//   storeToken,
//   verifyToken,
//   deleteToken,
//   hashPassword,
//   verifyPasswordResetToken,
// };
