const mongoose = require("mongoose");

const sallaStoreSchema = new mongoose.Schema({
  merchantId: {
    type: String,
    required: true,
    unique: true,
  },
  storeName: {
    type: String,
    required: true,
  },
  client_id: {
    type: String,
    required: true,
  },
  client_secret: {
    type: String,
    required: true,
  },
  access_token: String,
  refresh_token: String,
  tokenExpiry: Date,
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "inactive",
  },
  settings: {
    defaultShippingCarrier: {
      type: String,
      enum: ["Flow Express", "SMSA", "Aramex"],
      default: "Flow Express",
    },
    pickupAddress: String,
    webhookUrl: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamps on save
sallaStoreSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("SallaStore", sallaStoreSchema);
