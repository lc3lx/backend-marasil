const express = require("express");
const sallaController = require("../controllers/sallaController");

const router = express.Router();

// OAuth routes
router.get("/auth/url", sallaController.getAuthUrl);
router.get("/auth/callback", sallaController.handleCallback);

// Order management routes
router.get("/stores/:storeId/orders", sallaController.getStoreOrders);
// router.post("/stores/:storeId/sync-orders", sallaController.syncOrders);
router.post(
  "/stores/:storeId/orders/:orderId/status",
  sallaController.updateOrderStatus
);
router.post("/webhook", sallaController.handleOrderCreated);


// // Add new Salla store
// router.post("/stores", sallaController.addSallaStore);

// // Connect Salla store (initiate OAuth flow)
// router.get("/stores/:storeId/connect", sallaController.connectSallaStore);

// // Handle Salla callback (OAuth redirect)
// router.get("/callback", sallaController.handleSallaCallback);

// // Refresh access token
// router.post(
//   "/stores/:storeId/refresh-token",
//   sallaController.refreshSallaToken
// );

// // Fetch orders from Salla
// router.get("/stores/:storeId/orders", sallaController.fetchSallaOrders);

// // Get stored orders from database
// router.get("/stores/:storeId/stored-orders", sallaController.getStoredOrders);

// // Update order status
// router.put("/orders/:orderId/status", sallaController.updateOrderStatus);

module.exports = router;
