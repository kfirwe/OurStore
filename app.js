require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const app = express();
const loginRoutes = require("./controllers/loginController");
const wishListRoutes = require("./controllers/wishlistController");
const cartRoutes = require("./controllers/cartController");
const signUpRoutes = require("./controllers/signupController");
const logoutRoutes = require("./controllers/logoutController");
const adminRoutes = require("./controllers/adminController"); // Import admin routes
const { ensureAuthenticated } = require("./middleware/auth"); // Import middleware
const { Product } = require("./models/Product");
const { Cart } = require("./models/Cart");
const homepageController = require("./controllers/homepageController");
const createLog = require("./helpers/logHelper"); // Import the log helper

mongoose
  .connect("mongodb://127.0.0.1:27017/OurStore", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    createLog("INFO", "System", "Connected to MongoDB"); // Log the successful connection
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB", err);
    createLog(
      "ERROR",
      "System",
      `Failed to connect to MongoDB: ${err.message}`
    ); // Log the error
  });

app.use(
  session({
    secret: "bvfhefbiuefheiufh", // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "views")));
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

app.get("/", async (req, res) => {
  const username = req.session.user ? req.session.user.username : null;
  const isAdmin = req.session.user && req.session.user.role === "admin";

  // Fetch the cart for the current user
  let cartItemCount = 0;
  if (req.session.user?.username) {
    const cart = await Cart.findOne({ userName: username });
    if (cart) {
      cartItemCount = cart.products.length; // Count the number of distinct items in the cart
    }
  }

  res.render("LandingPage", {
    username, // Pass username to the view
    cartItemCount,
    isAdmin, // Pass isAdmin to the view
  });
});

app.get("/login", (req, res) => {
  // Store the current filters in session before login
  req.session.previousFilters = req.query; // Store filters in session
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});

// Route to handle the home page
app.get("/homePage", homepageController.getHomePage);
app.get(
  "/product-availability/:prodId",
  homepageController.checkProductAvailability
);
app.post("/add-to-cart", homepageController.addToCart);

app.use("/", loginRoutes);
app.use("/", wishListRoutes);
app.use("/", cartRoutes);
app.use("/", logoutRoutes);
app.use("/", signUpRoutes);
app.use("/", adminRoutes); // Use admin routes

app.listen(3000, () => {
  console.log("Server is running on port 3000");
  createLog("INFO", "System", "Server started on port 3000"); // Log the server start
});
