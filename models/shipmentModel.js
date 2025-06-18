const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    trackingId: {
      type: String,
      required: true,
      unique: true,
    },
    shippingType: {
      type: String,
      default: "straight",
    },
    merchantId: {
      type: String,
      required: true,
    },
    merchantEmail: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    senderAddress: {
      type: String,
      required: true,
    },
    receiverAddress: {
      type: String,
      required: true,
    },
    orderSource: {
      type: String,
      default: "API App",
    },
    shipper: {
      type: String,
      required: true,
      enum: ["Aramex", "smsa_b2c"],
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Prepaid", "COD"],
    },
    shipmentStatus: {
      type: String,
      default: "READY_FOR_PICKUP",
    },
    shipperStatus: String,
    shipmentDate: {
      type: Date,
      default: Date.now,
    },
    latestUpdateDate: {
      type: Date,
      default: Date.now,
    },
    orderValue: {
      type: Number,
      default: 0.0,
    },
    weight: {
      type: Number,
      required: true,
    },
    shippingPrice: {
      type: Number,
      required: true,
    },
    baseLabelPrice: {
      type: Number,
      required: true,
    },
    additionalWeightCost: {
      type: Number,
      default: 0.0,
    },
    codFees: {
      type: Number,
      default: 0.0,
    },
    torodMarkup: {
      type: Number,
      required: true,
    },
    pickupFees: {
      type: Number,
      default: 0.0,
    },
    insuranceCost: {
      type: Number,
      default: 0.0,
    },
    rtoPrice: {
      type: Number,
      default: 0.0,
    },
    shipmentType: {
      type: String,
      default: "is_normal",
    },
    codStatus: {
      type: String,
      default: "Pending",
    },
    platform: {
      type: String,
      default: "Marasil",
    },
    contractType: {
      type: String,
      default: "Marasil",
    },
    transferType: String,
    transferDate: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Shipment", shipmentSchema);
