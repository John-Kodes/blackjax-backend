module.exports = (fn) => (req, res, next) =>
  fn(req, res, next).catch((err) => next(err)); // Sends error to global error handler
