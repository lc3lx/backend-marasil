const express = require("express");
const {
  cancelShipment,
  getShipmentsStats,
  createShapment,
  trackingShipment,
  getCustomerShipments,
  getShipment,
  getAllShipments,
  getShipmentAdmin,
  updateShipment,
  deleteShipment,
  searchShipments,
} = require("../controllers/shapmentController");
const auth = require("../controllers/authController");

const router = express.Router();

// Customer routes (requires authentication)
router.get("/stats", auth.protect, getShipmentsStats);
router.get("/my-shipments", auth.protect, getCustomerShipments);
router.get("/my-shipment/:id", auth.protect, getShipment);
router.get("/search", auth.protect, searchShipments);

router.post("/createshipment", auth.protect, createShapment);
router.post("/traking/:id", auth.protect, trackingShipment);
router.post("/cancel/:id", auth.protect, cancelShipment);

// Admin routes (requires admin authentication)
router.get(
  "/all",
  auth.protect,
  auth.allowedTo("admin", "superadmin"),
  getAllShipments
);
router.get(
  "/admin/:id",
  auth.protect,
  auth.allowedTo("admin", "superadmin"),
  getShipmentAdmin
);
router.put(
  "/admin/:id",
  auth.protect,
  auth.allowedTo("admin", "superadmin"),
  updateShipment
);
router.delete(
  "/admin/:id",
  auth.protect,
  auth.allowedTo("admin", "superadmin"),
  deleteShipment
);
router.get(
  "/admin/search",
  auth.protect,
  auth.allowedTo("admin", "superadmin"),
  searchShipments
);

module.exports = router;
