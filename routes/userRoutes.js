const express = require("express");

const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup); // working
router.post("/login", authController.login); // working
router.get("/logout", authController.logout); // working
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.get("/", userController.getAllUsers);

router.use(authController.protect);

router.patch("/updatePassword", authController.updatePassword);

module.exports = router;
