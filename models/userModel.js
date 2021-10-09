const crypto = require("crypto");

const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

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
    enum: ["guest", "user", "admin"],
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
  active: {
    type: Boolean,
    default: true,
    select: false, // hidden when queried
  },
  currentScore: {
    type: Number,
    default: 1000,
  },
  highScore: {
    type: Number,
    default: 1000,
  },
  passwordChangedAt: {
    type: Date,
    select: false,
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
});

//// MIDDLEWARE ////
// Only outputs users that are active
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// encrypts password for newly created accounts
userSchema.pre("save", async function (next) {
  // .isModified(field): Checks if a field has been modified in a document
  if (!this.isModified("password")) return next();

  // Setting password to encrypted version of the original
  this.password = await bcrypt.hash(this.password, 12); // .hash(): 1st param is the value we want to encrypt and the 2nd param is the cost param. It's a measure of how CPU instensive this operation will be.

  next();
});

// Updates passwordChangedAt if password is modified
userSchema.pre("save", function (next) {
  // function exits if the password isn't modified or if the document is new
  if (!this.isModified("password") || this.isNew) return next();

  // we go 1 sec behind will ensure that the token is always created after the password has been changed.
  this.passwordChangedAt = Date.now() - 1000;

  next();
});

//// METHODS //// - available on all documents
userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password); // Boolean for conditional statements
};

// JWTTimestamp is time when the JWT was created
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // NOTE: if you are unable to get the property from the document, we need to make sure to update the schema so that it will create the user with the property
  if (this.passwordChangedAt) {
    // Here we convert the time to milliseconds and turn it to seconds
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // if password was updated after the original time, it results in true
    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

// Note: This method only modifies the document but does not save it. Saving should be done in the middleware function
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Encrypting the token: crypto.createHash('algorithm'), .update(variable) variable is what we want to update, .digest('hex') to store is as a hexadecimal
  // We save it into the database so then we can compare it with the token the user provides.
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // We send via email the unencrypted reset token. Otherwise, it wouldn't make much sense to encrypt it at all. So the database that was the exact same that we could use to change the password wouldn't be any encryption at all. The encrypted token will be useless to change the password
  return resetToken;
};
const User = mongoose.model("User", userSchema);

module.exports = User;
