const express = require("express");
const router = express.Router();
const zidController = require("../controllers/zidController");

// OAuth routes
router.get("/auth/url", zidController.getAuthUrl);
router.get("/zid/callback", zidController.handleCallback);

// Store routes
router.get("/stores/:storeId/orders", zidController.getOrders);
router.put(
  "/stores/:storeId/orders/:orderId/status",
  zidController.updateOrderStatus
);

module.exports = router;
