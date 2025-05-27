const express = require("express");
const router = express.Router();
const { protect, allowedTo } = require("../../controllers/authController");
const {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  hardDeleteEmployee,
  uploadEmployeeFiles,
  ResizeEmployeeImage,
} = require("../controllers/employeeController");

// Protect all routes
router.use(protect, allowedTo("admin", "user"));

// Employee routes
router
  .route("/")
  .get(getAllEmployees)
  .post(uploadEmployeeFiles, ResizeEmployeeImage, createEmployee);

router
  .route("/:id")
  .get(getEmployee)
  .patch(uploadEmployeeFiles, ResizeEmployeeImage,updateEmployee)

// Hard delete route (admin only)
router.delete("/:id", hardDeleteEmployee);

module.exports = router;
