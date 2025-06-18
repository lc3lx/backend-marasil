const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ["pending", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  platform: { type: String, required: true }, // نوع المنصة (مصدر الطلب)
  orderId: { type: String, required: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true }, // رقم الطلب
  orderDate: { type: Date, default: Date.now }, // تاريخ الطلب
  customer: {
    name: { type: String, required: true }, // اسم العميل
    phone: { type: String, required: true },
    country: { type: String, required: true }, // الدولة
    city: { type: String, required: true }, // المدينة // رقم جوال العميل
  },
  paymentMethod: { type: String, required: true }, // طريقة الدفع

  products: [
    {
      productName: { type: String, required: true }, // اسم المنتج
      quantity: { type: Number, required: true }, // الكمية
      productId: { type: String, required: true }, // معرف المنتج
      weight: { type: Number, required: true }, // وزن المنتج
      dimensions: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dimensions",
        required: true,
      }, // أبعاد المنتج (مرتبطة بالأبعاد الثابتة)
    },
  ],
  additionalInfo: { type: mongoose.Schema.Types.Mixed, default: {} }, // معلومات إضافية (اختياري)
});

// إضافة فهارس لتحسين البحث
orderSchema.index({ orderId: 1 }); // فهرس لرقم الطلب
orderSchema.index({ "customer.name": "text" }); // فهرس لاسم العميل
orderSchema.index({ "shippingAddress.city": "text" }); // فهرس باسم المدينة
orderSchema.index({ orderDate: 1 }); // فهرس لتاريخ الطلب

const Order = mongoose.model("order", orderSchema);

module.exports = Order;
