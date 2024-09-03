const { Log } = require("../models/Log");

const createLog = async (type, username, message) => {
  try {
    const newLog = new Log({
      type,
      username,
      message,
    });

    await newLog.save();
    // console.log("Log entry created successfully");
  } catch (error) {
    console.error("Error creating log entry:", error);
  }
};

module.exports = createLog;
