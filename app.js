require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const app = express();
const loginRoutes = require("./controllers/loginController");
const signUpRoutes = require("./controllers/signupController");
const logoutRoutes = require("./controllers/logoutController");
const adminRoutes = require("./controllers/adminController"); // Import admin routes
const { ensureAuthenticated } = require("./middleware/auth"); // Import middleware
const { Product } = require("./models/Product");
const homepageController = require("./controllers/homepageController");

mongoose
  .connect("mongodb://127.0.0.1:27017/OurStore", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB", err);
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

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});

// Route to handle the home page
app.get("/homePage", ensureAuthenticated, homepageController.getHomePage);

app.use("/", loginRoutes);
app.use("/", logoutRoutes);
app.use("/", signUpRoutes);
app.use("/", adminRoutes); // Use admin routes

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
