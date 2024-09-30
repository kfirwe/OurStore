const nodemailer = require("nodemailer");

// Create transporter for email service (Use SMTP provider like SendGrid or any other)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com", // Use your email service's SMTP host
  port: 465, // Port number for the SMTP server
  secure: true, // Set to true for port 465 (secure); false for other ports
  auth: {
    user: "byathread77@gmail.com", //process.env.EMAIL_USER, // Your email address
    pass: "drqw ioow clpa knyj", //process.env.EMAIL_PASSWORD, // Your email password
  },
});

// Function to send password reset email
const sendPasswordResetEmail = async (userEmail, resetToken) => {
  const resetURL = `http://localhost:3000/reset-password/${resetToken}`;

  const mailOptions = {
    from: "byathread77@gmail.com", // Your email address
    to: userEmail,
    subject: "Password Reset Request",
    text: `Please click the following link to reset your password: ${resetURL}`,
    html: `<p>Please click the following link to reset your password:</p><a href="${resetURL}">Reset Password</a>`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };
