const mongoose = require('mongoose');

const WooCommerceStoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  storeUrl: { type: String, required: true },
  consumerKey: { type: String, required: true },
  consumerSecret: { type: String, required: true },
});

module.exports = mongoose.model('wooCommerce', WooCommerceStoreSchema);