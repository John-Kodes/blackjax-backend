const express = require("express");

const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.get("/", userController.getAllUsers); // workin but may delete later

router.get("/getLeaderboard/page/:pageNum", userController.getLeaderboard);

router.use(authController.protect);

router.patch("/updatePassword", authController.updatePassword);

// update currentHigh

router
  .route("/me")
  .get(userController.getMe)
  .patch(userController.updateMe)
  .delete(userController.deleteMe);

module.exports = router;
