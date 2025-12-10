const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authenticateToken = require("../middleware/authMiddleware");

router.post("/send-otp", authController.sendOtp);
router.post("/login", authController.login);
router.get("/validate", authenticateToken, authController.validate);

module.exports = router;
