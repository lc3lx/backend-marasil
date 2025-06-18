const mongoose = require("mongoose");

const shapmentSchema = new mongoose.Schema({
  receiverAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CustomerAddress",
  },

  customerId: {
    type: mongoose.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  ordervalue: {
    type: Number,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  senderAddress: {
    type: Object,
  },
  boxNum: {
    type: Number,
  },
  weight: {
    type: Number,
  },
  dimension: {
    high: Number,
    width: Number,
    length: Number,
  },
  orderDescription: {
    type: String,
  },
  paymentMathod: {
    type: String,
    enum: ["Prepaid", "COD"],
  },
  shipmentstates: {
    type: String,
    enum: ["Delivered", "indelivery", "Canceled"],
  },

  shapmentingType: {
    type: String,
    enum: ["Dry", "Cold", "Quick", "Box"],
  },
  shapmentCompany: {
    type: String,
    enum: ["smsa", "aramex", "redbox", "omnillama"],
  },
  trackingId: {
    type: String,
  },
  storId: {
    type: String,
  },
  shapmentType: {
    type: String,

    enum: ["straight", "reverse"],
  },
  shapmentPrice: {
    type: Number,
  },
  orderSou: {
    type: String,
  },
  priceaddedtax: { type: Number, default: 0.15 },
  basePrice: { type: Number }, // السعر الأساسي (للمتعاقدين فقط)
  profitPrice: { type: Number },
  profitRTOprice: { type: Number },
  baseAdditionalweigth: { type: Number },
  profitAdditionalweigth: { type: Number },
  baseCODfees: { type: Number },
  profitCODfees: { type: Number },
  insurancecost: { type: Number },
  byocPrice: { type: Number, default: 0.0 },
  basepickUpPrice: { type: Number, default: 0.0 },
  profitpickUpPrice: { type: Number, default: 0.0 },
  baseRTOprice: { type: Number, default: 0.0 }, // رسوم الإرجاع
});

// إضافة indexes إضافية
shapmentSchema.index({ trackingId: 1 });
shapmentSchema.index({ orderId: 1 });
shapmentSchema.index({ status: 1 });

const Shapment = mongoose.model("Shapment", shapmentSchema);
module.exports = Shapment;
