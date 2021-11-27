const { promisify } = require("util");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it exists
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser)
    return next(
      new AppError("The user belonging to this token no longer exists", 401)
    );

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again", 401)
    );
  }

  res.status(200).json({
    status: "success",
    data: { user: currentUser },
  });
});

exports.signup = catchAsync(async (req, res, next) => {
  // validator
  const foundUser = await User.findOne({ username: req.body.username });
  if (foundUser !== null)
    return next(new AppError("Username already exists. Please try again", 400));

  const newUser = await User.create({
    username: req.body.username,
    color: req.body.color,
    email: req.body.email,
    password: req.body.password,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  // Temporarily disabled for email limitation reasons
  // const url = process.env.BLACKJAX_URL;
  // await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }
  const user = await User.findOne({ email }).select("+password");

  // checks if user exists and if password is correct.
  if (!user || !(await user.correctPassword(password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000), // lasts 10 sec
    httpOnly: true,
  });

  res.status(200).json({ status: "success" });
};

// This middleware is for checking if the user has a valid JWT, protecting the resource access it's attached to
exports.protect = catchAsync(async (req, res, next) => {
  // It's common for the token to be sent with an HTTP header with the request.
  let token;

  // Getting the token from the header (for postman testing)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    // authenticating users based on tokens sent via cookies.
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // verifying the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);

  if (!currentUser)
    return next(
      new AppError("The user belonging to this token no longer exists", 401)
    );

  // Check if user changed password after the token was issued
  // .iat is the time the JWT was created
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again", 401)
    );
  }

  // Granting user access and passing user data through req object
  req.user = currentUser;
  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email }).select("+email");
  if (!user)
    return next(new AppError("There is no user with that email address.", 404));

  // Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    // 3) Send it to user's email
    const resetURL = `${process.env.BLACKJAX_URL}/reset-password/${resetToken}`;

    await new Email(user, resetURL).sendResetPassword();

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // get user based on the resetToken
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    // This checks if the password token is expired
    passwordResetExpires: { $gt: Date.now() },
  });

  // If token has not expired, and there is user, set the new password
  if (!user) return next(new AppError("Token is invalid or has expired"), 400);

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // Get user from collection
  const user = await User.findById(req.user.id).select("+password");
  if (!user) return next(new AppError("user no existy"), 404);

  // Check if POSTed password is correct
  if (!(await user.correctPassword(req.body.currentPassword)))
    return next(
      new AppError("Your password was incorrect, please try again"),
      401
    );

  // Ensures new password wont be the same as old
  if (req.body.currentPassword === req.body.newPassword)
    return next(
      new AppError("New password cannot be the same as the old password!", 401)
    );

  // If so, update password
  user.password = req.body.newPassword;

  await user.save();

  // Log user in, send JWT
  createSendToken(user, 200, req, res);
});
