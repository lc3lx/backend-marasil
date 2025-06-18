const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["info", "warning", "success", "error"],
      default: "info",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedTo: {
      model: {
        type: String,
        enum: ["Order", "Shipment", "Wallet", "Transaction"],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;