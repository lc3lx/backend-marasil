const mongoose = require("mongoose");

const smsaOfficesSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
  },
  cityName: {
    type: String,
    required: true,
  },
  addressAR: {
    type: String,
    required: true,
  },
  coordinates: {
    type: String,
    required: true,
  },
  firstShift: {
    type: String,
    required: true,
  },
  secondShift: {
    type: String,
    default: "",
  },
  weekendShift: {
    type: String,
    default: "",
  },
  lastSync: {
    type: Date,
    default: Date.now,
  },
});
const smsaOffices = mongoose.model("SmsaOffices", smsaOfficesSchema);
module.exports = smsaOffices;
