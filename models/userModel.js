// const crypto = require("crypto");

const mongoose = require("mongoose");
const validator = require("validator");
// const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minLength: 6,
    maxLength: 40,
    select: false, // hides from query output
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  username: {
    type: String,
    required: [true, "Please provide a username"],
    minLength: 3,
    maxLength: 20,
  },
  color: {
    type: String,
    validate: [
      validator.isHexColor,
      "Please provide a valid hex color. (example: #00ffa6)",
    ],
  },
  highScore: Number,
  currentScore: Number,
});

// MIDDLEWARE

// METHODS

const User = mongoose.Model("User", userSchema);

module.exports = User;
