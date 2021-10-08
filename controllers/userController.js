const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

// url/api/v1/users/getLeaderboard/page/:pageNum (length = 20)
exports.getLeaderboard = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "Route handler is not made yet",
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: {
      user: req.user,
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password)
    return next(
      new AppError(
        "This route is not for password updates. Please use /updatePassword",
        400
      )
    );

  const { username, color } = req.body;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { username, color },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: { updatedUser },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "Route handler not yet created",
  });
});
