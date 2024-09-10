const { TwitterApi } = require("twitter-api-v2");
const User = require("../models/User");
const { Product } = require("../models/Product");
const { Purchase } = require("../models/Purchase");
const { Cart } = require("../models/Cart"); // Assuming you have a Cart model
const Coupon = require("../models/Coupon");
const { Log } = require("../models/Log");
const Discount = require("../models/Discount");
const createLog = require("../helpers/logHelper"); // Import the log helper

// Load environment variables
require("dotenv").config();

// Twitter API client initialization
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = client.readWrite;

exports.postTweet = async (req, res) => {
  try {
    const { tweetText } = req.body;

    // Check if an image is uploaded
    if (req.file) {
      // Upload the image to Twitter
      const mediaId = await rwClient.v1.uploadMedia(req.file.buffer, {
        type: "image",
      });

      // Post the tweet with the image
      await rwClient.v2.tweet({
        text: tweetText,
        media: {
          media_ids: [mediaId],
        },
      });

      await createLog(
        "INFO",
        req.session.user.username,
        "Tweet posted with an image."
      );
    } else {
      // Post the tweet without an image
      await rwClient.v2.tweet({
        text: tweetText,
      });

      await createLog(
        "INFO",
        req.session.user.username,
        "Tweet posted without an image."
      );
    }

    const tab = req.query.tab || "users"; // Default to 'users' if no tab is specified

    const logs = await Log.find({}).sort({ Date: -1 });
    const users = await User.find({});
    const products = await Product.find({});
    const coupons = await Coupon.find({});
    const purchases = await Purchase.find({});

    // Fetch discounts
    const discounts = await Discount.find();

    // Fetch the cart for the current user
    let cartItemCount = 0;
    if (req.session.user?.username) {
      const cart = await Cart.findOne({ userName: req.session.user.username });
      if (cart) {
        cartItemCount = cart.products.length; // Count the number of distinct items in the cart
      }
    }

    res.render("admin", {
      users,
      products,
      discounts,
      cartItemCount,
      purchases,
      coupons,
      logs,
      tab,
      filters: {},
      username: req.session.user ? req.session.user.username : null, // Pass the username
      isAdmin: req.session.user && req.session.user.role === "admin", // Pass isAdmin
      tweetPosted: true,
      tweetError: false,
    });
  } catch (error) {
    console.error("Error posting tweet:", error);

    await createLog(
      "ERROR",
      req.session.user.username,
      "Failed to post tweet."
    );

    const tab = req.query.tab || "users"; // Default to 'users' if no tab is specified

    const logs = await Log.find({}).sort({ Date: -1 });
    const users = await User.find({});
    const products = await Product.find({});
    const coupons = await Coupon.find({});
    const purchases = await Purchase.find({});

    // Fetch discounts
    const discounts = await Discount.find();

    // Fetch the cart for the current user
    let cartItemCount = 0;
    if (req.session.user?.username) {
      const cart = await Cart.findOne({ userName: req.session.user.username });
      if (cart) {
        cartItemCount = cart.products.length; // Count the number of distinct items in the cart
      }
    }

    res.render("admin", {
      users,
      products,
      discounts,
      cartItemCount,
      purchases,
      coupons,
      logs,
      tab,
      filters: {},
      username: req.session.user ? req.session.user.username : null, // Pass the username
      isAdmin: req.session.user && req.session.user.role === "admin", // Pass isAdmin
      tweetPosted: false,
      tweetError: true,
    });
  }
};
