const nodemailer = require("nodemailer");
require("dotenv").config();

// Create transporter for email service (Use SMTP provider like SendGrid or any other)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com", // Use your email service's SMTP host
  port: 465, // Port number for the SMTP server
  secure: true, // Set to true for port 465 (secure); false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASSWORD, // Your email password
  },
});

const sendPasswordResetEmail = async (email, token, username) => {
  // Include both email and username as query parameters in the reset link
  const resetLink = `http://localhost:3000/reset-password/${token}?email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}`;

  const mailOptions = {
    from: "ByAThread@gmail.com",
    to: email,
    subject: "Password Reset Request",
    text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
    html: `<p>You requested a password reset. Click the link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = { sendPasswordResetEmail };
