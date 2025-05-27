const express = require("express");
const router = express.Router();
const ShopifyController = require("../controllers/shopifyController");

router.get("/auth", ShopifyController.getAuthUrl);
router.get("/auth/callback", ShopifyController.authCallback);

router.get("/orders/:storeId", ShopifyController.getOrders);
router.put("/orders/:storeId/:orderId", ShopifyController.updateOrderStatus);
module.exports = router;
