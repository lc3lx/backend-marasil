const mongoose = require("mongoose");
const prsonealInfoSchema = new mongoose.Schema({
  customerId: { type: String, required: true, ref: "Customer" },
  cuntry: {
    type: String,
    required: true,
  },
  profileImg: {
    type: String,
  },
  typeAcount: {
    type: String,
    enum: ["subjective", "commercial"],
    required: true,
  },
  fistNameAr: {
    type: String,
    required: true,
  },
  lastNameAr: {
    type: String,
    required: true,
  },
  fistNameEn: {
    type: String,
    required: true,
  },
  lastNameEn: {
    type: String,
    required: true,
  },
  IdNumb: {
    type: Number,
    required: true,
  },
});
const prsonealInfo = mongoose.model("PrsonealInfo", prsonealInfoSchema);
module.exports = prsonealInfo;
