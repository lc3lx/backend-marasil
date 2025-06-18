/**
 * تحويل عنوان العميل إلى صيغة SMSA
 * @param {Object} address عنوان العميل من قاعدة البيانات
 * @returns {Object} عنوان بصيغة SMSA
 */
exports.formatAddress = (address) => {
  return {
    ContactName: address.full_name || "غير محدد", // بين 5 و150 حرف
    ContactPhoneNumber: address.phone || "0000000000", // رقم الهاتف
    Country: address.country || "SA", // رمز الدولة
    City: address.city || "غير محدد", // اسم المدينة
    AddressLine1: address.addressLine1 || "غير محدد",
  };
};

exports.Shapmentdata = (
  order,
  shipperAddress,
  Weight,
  Parcels,
  orderDescription,
  retailID,
  serviceCode
) => {
  const shipmentData = {
    CODAmount:
      order.paymentMethod === "COD"
        ? parseFloat(order.total.amount) || 0.0
        : 0.0,
    ConsigneeAddress: exports.formatAddress(order.customer), // عنوان المستلم
    ShipperAddress: exports.formatAddress(shipperAddress), // عنوان المرسل
    ContentDescription: orderDescription, // وصف الشحنة
    DeclaredValue: Math.max(parseFloat(order.total.amount || 0.1), 0.1), // القيمة المعلنة
    DutyPaid: false, // الضرائب مدفوعة؟
    OrderNumber: String(order.orderId || "ORD-UNKNOWN"), // رقم الطلب
    Parcels: Parcels, // عدد الطرود
    ServiceCode: serviceCode, // نوع الخدمة (يمكن تعديلها حسب الحاجة)
    ShipDate: new Date().toISOString(), // تاريخ الشحن
    ShipmentCurrency: "SAR", // العملة
    SMSARetailID: retailID || "0", // معرف التجزئة (يمكن تعديله حسب الحاجة)
    VatPaid: true, // الضريبة المضافة مدفوعة؟
    WaybillType: "PDF", // نوع الفاتورة
    Weight: Weight, // الوزن (يجب تحديثه حسب المنتجات)
    WeightUnit: "KG", // وحدة الوزن
  };
  return shipmentData;
};
