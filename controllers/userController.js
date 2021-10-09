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

// url/api/v1/users/getLeaderboard?page=1&sort=asc (length = 20)
// TODO: still need to implement pagination and be sure to have the ranks be accurate on different pages
exports.getLeaderboard = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 20;
  const sort = req.query.sort === "asc";
  const skip = (page - 1) * limit;

  const sortValue = (str) => {
    if (!sort) return str;
    return str.replace(/-/g, "");
  };

  const numUsers = await User.countDocuments();

  if (skip >= numUsers)
    return next(new AppError("This page does not exist", 404));

  const leaderboard = await User.find()
    .sort(sortValue("-highScore -currentScore"))
    .select("username color currentScore highScore rank")
    .skip(skip)
    .limit(limit);

  const findRank = (i, arrLength) => {
    if (!sort) return i + 1 + limit * (page - 1);
    return arrLength - (i + limit * (page - 1));
  };

  // Adding rank to each user
  const leaderboardRanks = leaderboard.map((user, i) => ({
    ...user._doc,
    rank: findRank(i, numUsers),
  }));

  res.status(200).json({
    status: "success",
    page,
    results: leaderboardRanks.length,
    data: {
      leaderboard: leaderboardRanks,
    },
  });
});

exports.updateScore = catchAsync(async (req, res, next) => {
  if (!req.body.currentScore)
    return next(new AppError("currentScore must be provided", 404));

  if (!req.body.adminPass || !req.body.adminPass === process.env.ADMIN_PASS)
    return next(
      new AppError(
        "valid adminPass must be provided to update a user's score",
        403
      )
    );

  const data = { currentScore: req.body.currentScore };
  const user = await User.findById(req.user._id);

  if (data.currentScore > user.highScore) {
    data.highScore = req.body.currentScore;
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, data, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
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
