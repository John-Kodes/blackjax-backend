const express = require("express");

const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.patch("/isLoggedIn", authController.isLoggedIn);
router.get("/logout", authController.logout);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.get("/leaderboardForGuest", userController.getLeaderboard);

router.use(authController.protect);

router.get("/leaderboard", userController.getLeaderboard);

//  update currentScore (conditionally update highScore)
router.patch("/updateScore", userController.updateScore);

router.patch("/updatePassword", authController.updatePassword);

router
  .route("/me")
  .get(userController.getMe)
  .patch(userController.updateMe)
  .delete(userController.deleteMe);

module.exports = router;
