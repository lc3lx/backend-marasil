const Notification = require("../models/notifactionModel");
const factory = require("./handlersFactory");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");

// Get all notifications for a specific user
exports.getMyNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;
  
  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const totalNotifications = await Notification.countDocuments({ recipient: userId });
  
  res.status(200).json({
    status: "success",
    results: notifications.length,
    page,
    totalPages: Math.ceil(totalNotifications / limit),
    data: notifications,
  });
});

// Mark notification as read
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notificationId = req.params.id;
  const userId = req.user._id;
  
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true }
  );
  
  if (!notification) {
    return next(new ApiError("Notification not found or not authorized", 404));
  }
  
  res.status(200).json({
    status: "success",
    data: notification,
  });
});

// Mark all notifications as read
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  
  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true }
  );
  
  res.status(200).json({
    status: "success",
    message: "All notifications marked as read",
  });
});

// Admin: Send notification to a specific user
exports.sendNotification = asyncHandler(async (req, res, next) => {
  const { recipientId, title, message, type, relatedTo } = req.body;
  
  if (!recipientId || !title || !message) {
    return next(new ApiError("Recipient ID, title, and message are required", 400));
  }
  
  const notification = await Notification.create({
    recipient: recipientId,
    sender: req.user._id,
    title,
    message,
    type: type || "info",
    relatedTo,
  });
  
  // Send real-time notification via Socket.IO
  const io = req.app.get("io");
  const activeUsers = req.app.get("activeUsers");
  
  // Send to specific user's room
  io.to(`user-${recipientId}`).emit("notification", notification);
  
  res.status(201).json({
    status: "success",
    data: notification,
  });
});

// Admin: Send notification to multiple users
exports.sendBulkNotifications = asyncHandler(async (req, res, next) => {
  const { recipientIds, title, message, type, relatedTo } = req.body;
  
  if (!recipientIds || !Array.isArray(recipientIds) || !title || !message) {
    return next(new ApiError("Recipients array, title, and message are required", 400));
  }
  
  const notifications = [];
  
  for (const recipientId of recipientIds) {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: req.user._id,
      title,
      message,
      type: type || "info",
      relatedTo,
    });
    
    notifications.push(notification);
    
    // Send real-time notification via Socket.IO
    const io = req.app.get("io");
    io.to(`user-${recipientId}`).emit("notification", notification);
  }
  
  res.status(201).json({
    status: "success",
    results: notifications.length,
    data: notifications,
  });
});

// Get notification by ID (for admin)
exports.getNotification = factory.getOne(Notification);

// Get all notifications (for admin)
exports.getAllNotifications = factory.getAll(Notification);

// Delete notification
exports.deleteNotification = factory.deleteOne(Notification);