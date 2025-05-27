const express = require("express");
const {
  createShapment,
  trackingShipment,
} = require("../controllers/shapmentController");

const router = express.Router();

router.post("/createshipment", createShapment);
router.post("/traking", trackingShipment);
module.exports = router;
