const mongoose = require("mongoose");

const sallaStoreSchema = new mongoose.Schema({
  customerId: { type: String, required: true, ref: "Customer" }, // معرف الزبون
  storeName: { type: String, required: true }, // اسم المتجر
  client_id: { type: String, required: true }, // Client ID الخاص بالزبون
  client_secret: { type: String, required: true }, // Client Secret الخاص بالزبون
  access_token: { type: String }, // Access Token
  refresh_token: { type: String }, // Refresh Token
  createdAt: { type: Date, default: Date.now },
});

const SallaStore = mongoose.model("SallaStore", sallaStoreSchema);

module.exports = SallaStore;
