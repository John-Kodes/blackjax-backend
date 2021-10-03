const express = require("express");

const userController = require("../controllers/userController");

const router = express.Router();

router.post("/signup");

router.route("/").get(userController.test).post(userController.createUser);

module.exports = router;
