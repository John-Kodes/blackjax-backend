exports.test = (req, res, next) => {
  console.log("i am running");
  res.status(200).json({ status: "success", message: "yo" });
};
