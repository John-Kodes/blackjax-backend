const catchAsync = require("../utils/catchAsync");
// const AppError = require("../utils/appError");
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
    message: "Route handler is not made yet",
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "Route handler is not made yet",
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "Route handler is not made yet",
  });
});
