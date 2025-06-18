const mongoose = require("mongoose");
const carriersSchema = new mongoose.Schema({
  carriersNmae: {
    type: String,
    required: true,
  },
  deliveryTime: {
    type: String,
    required: true,
  },
  deliveryTimeAr: {
    type: String,
    required: true,
  },
  prise: {
    type: Number,
    required: true,
  },
  country: {
    type: String,
    required: true,
    enum: [
      "Saudi Arabia",
      "Kuwait",
      "Egypt",
      "United Arab Emirates",
      "Bahrain",
      "Oman",
      "Qatar",
    ],
  },
  Status: {
    type: String,
    required: true,
    enum: ["Enabled", "Disabled"],
  },
  shipperGroup: {
    required: true,
    type: String,
    enum: ["Fastcoo", "Fizzpa", "LogesTechs", "Shipox", "Shipsy"],
  },
  conditions: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  conditionsAr: {
    type: String,
    required: true,
  },
  detailsAr: {
    type: String,
    required: true,
  },
  trackingURL: {
    type: String,
  },
  pickUpStatus: {
    type: String,
    required: true,
    enum: ["Yse", "No"],
  },
  deliveryPromiseType: {
    type: String,
    required: true,
    enum: ["Static"],
  },
});
