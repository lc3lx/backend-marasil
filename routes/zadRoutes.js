const express = require("express");
const router = express.Router();
const zadController = require("../controllers/zadController");

// إضافة متجر Zad جديد
router.post("/add", zadController.addZadStore);

// توجيه الزبون لربط المتجر
router.get("/connect/:storeId", zadController.connectZadStore);

// التعامل مع الرد بعد الموافقة
router.get("/callback", zadController.handleZadCallback);

// جلب الطلبات من متجر Zad
router.get("/orders/:storeId", zadController.fetchZadOrders);

module.exports = router;
