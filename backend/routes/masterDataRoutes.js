const express = require("express");
const router = express.Router();
const masterDataController = require("../controllers/masterDataController");
const authenticateToken = require("../middleware/authMiddleware");

router.get(
  "/master-data",
  authenticateToken,
  masterDataController.getMasterData
);
router.get(
  "/customers/:code",
  authenticateToken,
  masterDataController.getCustomer
);

module.exports = router;
