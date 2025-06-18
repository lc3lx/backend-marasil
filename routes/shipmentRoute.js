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
router.get("/stats", auth.Protect, getShipmentsStats);
router.get("/my-shipments", auth.Protect, getCustomerShipments);
router.get("/my-shipment/:id", auth.Protect, getShipment);
router.get("/search", auth.Protect, searchShipments);

router.post("/createshipment", auth.Protect, createShapment);
router.post("/traking", auth.Protect, trackingShipment);
router.post("/cancel", auth.Protect, cancelShipment);

// Admin routes (requires admin authentication)
router.get("/all", auth.Protect, auth.allowedTo("admin"), getAllShipments);
router.get(
  "/admin/:id",
  auth.Protect,
  auth.allowedTo("admin"),
  getShipmentAdmin
);
router.put(
  "/admin/:id",
  auth.Protect,
  auth.allowedTo("admin", "superadmin"),
  updateShipment
);
router.delete(
  "/admin/:id",
  auth.Protect,
  auth.allowedTo("admin", "superadmin"),
  deleteShipment
);
router.get("/admin/search", searchShipments);

module.exports = router;
