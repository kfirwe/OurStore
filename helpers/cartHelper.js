const { Cart } = require("../models/Cart");
const { Product } = require("../models/Product");
const createLog = require("./logHelper");
const mapToObject = require("../helpers/homepageHelper");

const addToCart = async (req, res) => {
  const { userName, prodId, color, size } = req.body;

  try {
    // Ensure the color and size are provided in the request
    if (!color || !size) {
      return res.status(400).json({ message: "Color and size are required" });
    }

    const product = await Product.findOne({ prodId });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Convert Map to Object for easier handling
    const colorsObject = mapToObject(product.colors);

    // Check if the color and size are valid
    if (!colorsObject[color] || !colorsObject[color][size]) {
      return res
        .status(400)
        .json({ message: "Invalid color or size selection" });
    }

    // Check if the selected size is out of stock
    if (colorsObject[color][size] < 1) {
      return res
        .status(400)
        .json({ message: "The selected size is out of stock" });
    }

    let cart = await Cart.findOne({ userName });

    if (!cart) {
      cart = new Cart({ userName, products: [] });
    }

    // Check if the product with the same color and size already exists in the cart
    const productInCart = cart.products.find(
      (p) => p.prodId === prodId && p.color === color && p.size === size
    );

    if (productInCart) {
      productInCart.quantity += 1; // Increment quantity if already in cart
    } else {
      // Add new product with color and size to the cart
      cart.products.push({
        prodId: product.prodId,
        name: product.name,
        price: product.price,
        category: product.category,
        company: product.company,
        gender: product.gender,
        image: product.image,
        imageType: product.imageType,
        color: color, // Ensure color is passed
        size: size, // Ensure size is passed
        quantity: 1, // Initial quantity is 1
      });
    }

    // Save the cart with the new product
    await cart.save();

    // Calculate the updated cart item count (total quantity of all products in the cart)
    const cartItemCount = cart.products.length;

    // Log the addition of the product to the cart
    await createLog("INFO", req.session.user.username, "Product added to cart");

    // Return success response along with the updated cart item count
    res.status(200).json({
      message: "Product added to cart",
      cartItemCount, // Include the updated cart item count
    });
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
