const { TwitterApi } = require("twitter-api-v2");
const User = require("../models/User");
const { Product } = require("../models/Product");
const { Purchase } = require("../models/Purchase");
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

    const users = await User.find({});
    const products = await Product.find({});
    const purchases = await Purchase.find().sort({ Date: -1 }).lean();

    res.render("admin", {
      users,
      products,
      purchases,
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

    const users = await User.find({});
    const products = await Product.find({});
    const purchases = await Purchase.find().sort({ Date: -1 }).lean();

    res.render("admin", {
      users,
      products,
      purchases,
      tweetPosted: false,
      tweetError: true,
    });
  }
};
