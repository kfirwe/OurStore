const { Cart } = require("../models/Cart");
const { Product } = require("../models/Product");
const createLog = require("./logHelper");

const addToCart = async (req, res) => {
  const { userName, prodId } = req.body;

  try {
    const product = await Product.findOne({ prodId });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.amount < 1) {
      return res.status(400).json({ message: "Product is out of stock" });
    }

    let cart = await Cart.findOne({ userName });

    if (!cart) {
      cart = new Cart({ userName, products: [] });
    }

    const productInCart = cart.products.find((p) => p.prodId === prodId);

    if (productInCart) {
      productInCart.quantity += 1;
    } else {
      cart.products.push({
        prodId: product.prodId,
        name: product.name,
        price: product.price,
        category: product.category,
        company: product.company,
        gender: product.gender,
        image: product.image,
        imageType: product.imageType,
        amount: product.amount,
        quantity: 1,
      });
    }

    await cart.save();

    // Send a JSON response
    await createLog("INFO", req.session.user.username, "Product added to cart");
    res.status(200).json({ message: "Product added to cart" });
  } catch (error) {
    console.error("Error adding product to cart:", error);
    await createLog(
      "ERROR",
      req.session.user.username,
      "Error adding product to cart"
    );
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = addToCart;
