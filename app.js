const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const app = express();
const loginRoutes = require("./controllers/loginController");
const signUpRoutes = require("./controllers/signupController");

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

app.get("/homePage", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "homePage.html"));
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
    const items = await Item.find(query); // Assuming Item is a Mongoose model
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Error fetching items." });
  }
});

app.use("/", loginRoutes);
app.use("/", signUpRoutes);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
