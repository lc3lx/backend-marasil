const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const shopifyStoreSchema = new mongoose.Schema({
  customerId: { type: String, required: true, ref: "Customer" }, // معرف الزبون
  storeName: { type: String, required: true }, // اسم المتجر
  api_key: { type: String, required: true }, // API Key الخاص بالزبون
  api_secret: { type: String, required: true }, // API Secret Key الخاص بالزبون (مشفر)
  createdAt: { type: Date, default: Date.now },
});

// تشفير api_secret قبل الحفظ
shopifyStoreSchema.pre("save", async function (next) {
  if (!this.isModified("api_secret")) return next();

  const hashedSecret = await bcrypt.hash(this.api_secret, 10);
  this.api_secret = hashedSecret;
  next();
});

const ShopifyStore = mongoose.model("ShopifyStore", shopifyStoreSchema);

module.exports = ShopifyStore;
