const { promisify } = require("util");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  console.log(user._id, token);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  console.log("bruh", token);

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    username: req.body.username,
    color: req.body.color,
    email: req.body.email,
    password: req.body.password,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  createSendToken(newUser, 201, res);
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

  createSendToken(user, 200, res);
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
  // jwt.verify() returns a promise. The params are the token we want to verify and the secret key.
  // promisfy() comes from the node module "util". It returns a version Promise of your function. The last param must be a callback, in this case jwt.verify(). The callback must follow Node's callback style (err, result)
  // The second () is just used to immediately call the function with the arguments inside.
  // decoded stores the payload from the JWT
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

  // Grants access to protected route and also adds user data to req. We can use the req to send data from middleware to middleware
  req.user = currentUser;
  next();
});

// roles is an array of arguments passed in. [admin, user]
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // We get the user data by first using .protect() middleware
    if (!roles.includes(req.user.role))
      next(new AppError("You do not have permission to run this action", 403));

    // if the role is included to the permitted roles array, we move on to the next middleware
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError("There is no user with that email address.", 404));

  // Generate the random reset token
  // We will create an instance method on the user Model since this has to do with the user data itself.
  const resetToken = user.createPasswordResetToken();
  // saving the document after the modifications from the instance method
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  // resetURL: Ideally, the user can click on the email and do the request from there. That will work later for when we implement our dynamic website. For now, the user can copy the url to make it easier to do this request
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password 
  and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  // putting it in a try/catch block for more complex error handling
  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });

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

// Note: we grab the token from the URL of the api req which was emailed to the user
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on the resetToken
  // we first get the resetToken then encrypt it so that we can compare that with the already encrypted version saved in the database
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    // This checks if the password token is expired
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) return next(new AppError("Token is invalid or has expired"), 400);
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // This only modifies the document so we have to save the changes
  await user.save(); // validator makes sure that the password and passwordConfirm are the same

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("+password");
  if (!user) return next(new AppError("user no existy"), 404);

  // 2) Check if POSTed password is correct
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

  // 3) If so, update password
  user.password = req.body.newPassword;

  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
