const express = require("express");
const router = express.Router();
const office = require("../controllers/officesController");
router.get("/:compny", office.getOffices);

module.exports = router;
