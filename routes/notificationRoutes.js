const express = require("express");
const router = express.Router();

const { Protect,allowedTo  } = require("../controllers/authController");
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  sendNotification,
  sendBulkNotifications,
  getNotification,
  getAllNotifications,
  deleteNotification,
} = require("../controllers/notificationController");

// User routes
router.use(Protect);
router.get("/my-notifications", getMyNotifications);
router.patch("/mark-as-read/:id", markAsRead);
router.patch("/mark-all-as-read", markAllAsRead);

// Admin routes
router.use(allowedTo("admin", "superadmin"));
router.post("/send", sendNotification);
router.post("/send-bulk", sendBulkNotifications);
router.route("/")
  .get(getAllNotifications);
router.route("/:id")
  .get(getNotification)
  .delete(deleteNotification);

module.exports = router;