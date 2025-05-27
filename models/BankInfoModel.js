const mongoose = require("mongoose");
const bankInfoSchema = new mongoose.Schema({
  customerId: { type: String, required: true, ref: "Customer" },
  bankName: { type: String, required: true },
  CompnyName: { type: String, required: true },
  ibanNumber: { type: Number, required: true },
  ibanFile: { type: String, required: true },
});
const bankInfo = mongoose.model("BankInfo", bankInfoSchema);
module.exports = bankInfo;
