const mongoose = require("mongoose");
const clientAddress = require("./clientAddressModel");

const orderSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  reference_id: { type: Number, required: true },

  total: {
    amount: Number,
    currency: { type: String, default: "SAR" },
  },

  date: {
    date: String,
    timezone_type: { type: Number, default: 3 },
    timezone: { type: String, default: "Asia/Riyadh" },
  },
  status: {
    id: String,
    name: String,
    slug: String,
    customized: {
      id: String,
      name: String,
    },
  },
  payment_method: String,
  is_pending_payment: { type: Boolean, default: false },
  pending_payment_ends_at: { type: Number, default: 0 },
  features: {
    shippable: { type: Boolean, default: false },
    digitalable: { type: Boolean, default: false },
    pickable: { type: Boolean, default: false },
    has_suspicious_alert: { type: Boolean, default: false },
    bullet_delivery: { type: [String], default: [] },
  },
  payment_actions: {
    refund_action: {
      has_refund_amount: { type: Boolean, default: false },
      payment_method_label: String,
      can_print_refund_invoice: { type: Boolean, default: false },
      paid_amount: {
        amount: Number,
        currency: { type: String, default: "SAR" },
      },
      refund_amount: {
        amount: Number,
        currency: { type: String, default: "SAR" },
      },
      loyalty_point_programs: { type: [String], default: [] },
      can_send_sms: { type: Boolean, default: false },
      can_send_sms_msg: String,
    },
    remaining_action: {
      has_remaining_amount: { type: Boolean, default: false },
      payment_method_label: String,
      paid_amount: {
        amount: Number,
        currency: { type: String, default: "SAR" },
      },
      checkout_url: String,
      remaining_amount: {
        amount: Number,
        currency: { type: String, default: "SAR" },
      },
    },
  },
  items: [
    {
      name: String,
      quantity: Number,
      thumbnail: String,
    },
  ],
  customer: {
    id: String,
    full_name: String,
    first_name: String,
    last_name: String,
    mobile: String,
    mobile_code: String,
    email: String,
    urls: {
      customer: String,
      admin: String,
    },
    city: String,
    country: String,
    country_code: String,
    currency: { type: String, default: "SAR" },
    location: String,
    created_at: {
      date: String,
      timezone_type: { type: Number, default: 3 },
      timezone: { type: String, default: "Asia/Riyadh" },
    },
    updated_at: {
      date: String,
      timezone_type: { type: Number, default: 3 },
      timezone: { type: String, default: "Asia/Riyadh" },
    },
    groups: { type: [String], default: [] },
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  platform: { type: String, default: "salla" },



  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Add indexes for better query performance
orderSchema.index({ id: 1, storeId: 1 }, { unique: true });
orderSchema.index({ "customer.id": 1 });
orderSchema.index({ "status.slug": 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
