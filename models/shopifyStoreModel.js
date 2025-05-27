const mongoose = require("mongoose");

const shopifyStoreSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
    },
    shop: {
      type: String,
      required: true,
      unique: true,
    },
    storeName: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    settings: {
      defaultShippingCarrier: {
        type: String,
        enum: ["Flow Express", "SMSA", "Aramex"],
        default: "Flow Express",
      },
      pickupAddress: {
        street: String,
        city: String,
        country: String,
        details: String,
      },
      autoCreateShipment: {
        type: Boolean,
        default: false,
      },
    },
    webhookSecret: String,
    lastSyncDate: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ShopifyStore", shopifyStoreSchema);
