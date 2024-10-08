const bcrypt = require("bcrypt");

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
  console.log(password);
  const salt = await bcrypt.genSalt(10);
  new_password = await bcrypt.hash(password, salt);
  console.log(new_password);
  return new_password;
};

module.exports = { storeToken, verifyToken, deleteToken, hashPassword };
