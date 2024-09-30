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
const profileController = require("./controllers/profileController");
const abouController = require("./controllers/aboutController");
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

app.get("/confirmation", async (req, res) => {
  const { purchaseId, country, city, street, number } = req.query;

  // Assuming you have `username` stored in session or JWT token
  const username = req.session.username; // adjust according to how you store the user

  const isAdmin = req.session.user && req.session.user.role === "admin";

  // Example: Fetch cartItemCount from database, assuming you have a Cart model or similar
  let cartItemCount = 0;

  try {
    // Assuming the cart is stored in the DB and linked to the user's session or ID
    const cart = await Cart.findOne({ userId: username }); // Adjust accordingly
    cartItemCount = cart ? cart.products.length : 0;
  } catch (error) {
    console.error("Error fetching cart:", error);
    cartItemCount = 0;
  }

  // Render the confirmation page with all the data
  res.render("confirmed", {
    purchaseId: purchaseId,
    username: username,
    isAdmin,
    cartItemCount: cartItemCount,
    user: {
      country: country,
      city: city,
      street: street,
      number: number,
    },
  });
});

// Route to handle the home page
app.get("/homePage", homepageController.getHomePage);
app.get(
  "/product-availability/:prodId",
  homepageController.checkProductAvailability
);
// app.post("/add-to-cart", homepageController.addToCart);

app.use("/", loginRoutes);
app.use("/", wishListRoutes);
app.use("/", cartRoutes);
app.use("/", logoutRoutes);
app.use("/", signUpRoutes);
app.use("/", adminRoutes); // Use admin routes
app.use("/", profileController); // Use profile routes
app.use("/", abouController); // Use about us controller

app.listen(3000, () => {
  console.log("Server is running on port 3000");
  createLog("INFO", "System", "Server started on port 3000"); // Log the server start
});
