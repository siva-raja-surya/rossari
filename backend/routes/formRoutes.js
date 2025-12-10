const express = require("express");
const router = express.Router();
const formController = require("../controllers/formController");
const authenticateToken = require("../middleware/authMiddleware");

router.post("/", authenticateToken, formController.submitForm);
router.get("/", authenticateToken, formController.getForms);

module.exports = router;
