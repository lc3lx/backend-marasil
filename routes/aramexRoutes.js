const express = require("express");
const router = express.Router();
const aramexController = require("../controllers/aramexController");

// Create shipment
router.post("/shipments/:orderId", async (req, res) => {
  try {
    const result = await aramexController.createShipment(req.params.orderId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create shipment",
      error: error.message,
    });
  }
});

// Track shipment
router.get("/shipments/:trackingNumber/track", async (req, res) => {
  try {
    const result = await aramexController.trackShipment(
      req.params.trackingNumber
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to track shipment",
      error: error.message,
    });
  }
});

// Cancel shipment
router.delete("/shipments/:trackingNumber", async (req, res) => {
  try {
    const result = await aramexController.cancelShipment(
      req.params.trackingNumber
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel shipment",
      error: error.message,
    });
  }
});

// Schedule delivery
router.post("/shipments/:trackingNumber/schedule", async (req, res) => {
  try {
    const { preferredDeliveryDate, location, contact } = req.body;
    const result = await aramexController.scheduleDelivery(
      req.params.trackingNumber,
      new Date(preferredDeliveryDate),
      location,
      contact
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to schedule delivery",
      error: error.message,
    });
  }
});

module.exports = router;
