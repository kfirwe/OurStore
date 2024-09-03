const express = require("express");
const router = express.Router();
const addToCart = require("../helpers/cartHelper");

router.post("/add-to-cart", addToCart);

module.exports = router;
