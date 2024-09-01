const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const app = express();
const loginRoutes = require("./controllers/loginController");
const signUpRoutes = require("./controllers/signupController");
const adminRoutes = require("./controllers/adminController"); // Import admin routes
const { ensureAuthenticated } = require("./middleware/auth"); // Import middleware
const { Product } = require("./models/Product");

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

const homepageController = require("./controllers/homepageController");

// Route to handle the home page
app.get("/homePage", ensureAuthenticated, homepageController.getHomePage);

app.get("/product-image/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product || !product.image || !product.imageType) {
      return res.status(404).send("Image not found");
    }

    res.set("Content-Type", product.imageType); // Set the content type to the image's MIME type
    res.send(product.image); // Send the binary data
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.get("/api/items", async (req, res) => {
  const { filterId, filterName, filterPrice, filterCategory, filterCompany } =
    req.query;

  let query = {};

  if (filterId) {
    query._id = filterId; // Assuming MongoDB is used
  }

  if (filterName) {
    query.name = { $regex: new RegExp("^" + filterName, "i") }; // Case-insensitive matching
  }

  if (filterPrice) {
    query.price = { $lte: parseFloat(filterPrice) }; // Items with price less than or equal to filterPrice
  }

  if (filterCategory) {
    query.category = filterCategory;
  }

  if (filterCompany) {
    query.company = filterCompany;
  }

  try {
    const items = await Product.find(query); // Assuming Product is a Mongoose model
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Error fetching items." });
  }
});

app.use("/", loginRoutes);
app.use("/", signUpRoutes);
app.use("/", adminRoutes); // Use admin routes

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
