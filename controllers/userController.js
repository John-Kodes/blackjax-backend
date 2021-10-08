const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    status: "success",
    results: users.length,
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
  await User.findOneAndUpdate(req.user._id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});
