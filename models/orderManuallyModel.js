const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  // ClientAddress
  platform: {
    type: String,
    default: "Marasil",
  },
  number_of_boxes: {
    type: Number,
    required: true,
  },
  weight: {
    type: Number,
    required: true,
  },
  box_dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
  },
  product_description: {
    type: String,
    // required: true,
  },

  payment_method: {
    type: String,
    required: true,
    enum: ["Prepaid", "Cash on Delivery"],
  },
  product_value: {
    type: Number,
    required: false,
  },
  order_number: {
    type: String,
    required: false,
  },

  clientAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClientAddress",
    required: true,
  },
  customer: {
    type: mongoose.Schema.ObjectId,
    ref: "Customer",
  },
  
});

orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "clientAddress",
    select:
      "clientName clientAddress addressDetails clientPhone clientEmail country city district -_id,customer",
  });
  next();
});



module.exports = mongoose.model("orderManual", orderSchema);
