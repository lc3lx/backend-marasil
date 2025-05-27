const express = require("express");
const router = express.Router();
const sallaWebhookController = require("../controllers/sallaWebhookController");

    router.post("/order", sallaWebhookController.handleOrderCreated);

module.exports = router;