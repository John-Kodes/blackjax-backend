const User = require("../models/userModel");

exports.test = (req, res, next) => {
  console.log("i am running");
  res.status(200).json({ status: "success", message: "yo" });
};

exports.createUser = async (req, res, next) => {
  console.log("creating user...");
  const { email, password, username } = req.body;

  const user = await User.create({ email, password, username });

  res.status(201).json({
    status: "success",
    data: {
      user,
    },
  });
};
