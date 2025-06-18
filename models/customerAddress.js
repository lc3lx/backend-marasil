const mongoose = require("mongoose");
const customerAddress = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Customer",
  },
  warehousesName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  postalCodeZip: {
    type: Number,
  },
  district: {
    type: String,
  },
});
const CustomerAddress = mongoose.model("CustomerAddress", customerAddress);
module.exports = CustomerAddress;
