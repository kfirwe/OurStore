const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const app = express();
const loginRoutes = require("./controllers/loginController");
const signUpRoutes = require("./controllers/signupController");

// Connect to MongoDB
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

app.use(express.json()); // To parse JSON bodies
app.use(express.urlencoded({ extended: true })); // To parse form-encoded bodies
app.use(express.static("public")); // Serve static files from the 'public' directory

// Route to serve the login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

// Route to serve the sign-up page
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});

// Use the login routes for handling login logic
app.use("/", loginRoutes); // init route path to root path

// Use the signup routes for handling signup logic
app.use("/", signUpRoutes); // init route path to root path

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
