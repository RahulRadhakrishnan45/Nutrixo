const mongoose = require("mongoose");

const connectDB = async () => {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("DB Connected");
    })
    .catch((err) => {
      console.log("MongoDB Connection error", err);
    });
};

module.exports = connectDB;
