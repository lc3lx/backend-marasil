const express = require("express");
const router = express.Router();
const salaryController = require("../controllers/salaryModification");
const authController = require("../../controllers/authController");

// Protect all routes
router.use(authController.protect);

// Bonus routes
router.post("/:employeeId/bonus", salaryController.addBonus);

// Deduction routes
router.post("/:employeeId/deduction", salaryController.addDeduction);

router.get("/",salaryController.getAllsalaryModifaction)

module.exports = router;
