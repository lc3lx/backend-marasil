/**
 * تحويل عنوان العميل إلى صيغة Aramex
 * @param {Object} address عنوان العميل من قاعدة البيانات
 * @returns {Object} عنوان بصيغة Aramex
 */
exports.formatAddress = (address) => {
  return {
    Line1: address.addressLine1 || "غير محدد",
    Line2: address.addressLine2 || "",
    Line3: address.addressLine3 || "",
    City: address.city || "غير محدد",
    PostCode: address.postCode || "",
    CountryCode: address.country || "SA",
  };
};

/**
 * تحويل بيانات الشحنة إلى صيغة Aramex
 * @param {Object} order بيانات الطلب
 * @param {Object} shipperAddress عنوان المرسل
 * @param {Object} box أبعاد الصندوق
 * @returns {Object} بيانات الشحنة بصيغة Aramex
 */
exports.shipmentData = (order, shipperAddress, box) => {
  return {
    reference1: order.reference_id || "ORD-UNKNOWN",
    reference2: order.order_number || "",
    reference3: order.platform || "",
    reference4: "",
    reference5: "",
    shipperReference1: shipperAddress.reference || "Ref1",
    shipperAddress: exports.formatAddress(shipperAddress),
    shipperContactName: shipperAddress.full_name || "غير محدد",
    shipperCompanyName: shipperAddress.company_name || "غير محدد",
    shipperPhone: shipperAddress.phone || "0000000000",
    shipperMobile: shipperAddress.mobile || "0000000000",
    shipperEmail: shipperAddress.email || "test@example.com",
    consigneeReference1: order.customer.reference || "Ref2",
    consigneeAddress: exports.formatAddress(order.customer),
    consigneeContactName: order.customer.full_name || "غير محدد",
    consigneeCompanyName: order.customer.company_name || "غير محدد",
    consigneePhone: order.customer.phone || "0000000000",
    consigneeMobile: order.customer.mobile || "0000000000",
    consigneeEmail: order.customer.email || "test@example.com",
    paymentType: order.payment_method === "COD" ? "P" : "C",
    productGroup: "EXP",
    productType: "PDX",
    numberOfPieces: order.package_count || 1,
    actualWeight: order.weight || 1.0,
    chargeableWeight: order.weight || 1.0,
    length: box?.length || 10,
    width: box?.width || 10,
    height: box?.height || 10,
    goodsDescription: order.description || "منتجات عامة",
    goodsOriginCountry: "SA",
    services: "",
    paymentOptions: order.payment_method === "COD" ? "CASH" : "PREPAID",
  };
};

/**
 * تحويل بيانات الاستلام إلى صيغة Aramex
 * @param {Object} pickupData بيانات الاستلام
 * @returns {Object} بيانات الاستلام بصيغة Aramex
 */
exports.pickupData = (pickupData) => {
  return {
    pickupAddress: exports.formatAddress(pickupData.address),
    contactName: pickupData.contact_name || "غير محدد",
    companyName: pickupData.company_name || "غير محدد",
    phone: pickupData.phone || "0000000000",
    mobile: pickupData.mobile || "0000000000",
    email: pickupData.email || "test@example.com",
    pickupDateTime: pickupData.pickup_date_time || Date.now(),
    closingDateTime: pickupData.closing_date_time || Date.now() + 3600000,
  };
};

/**
 * تحويل بيانات التسليم المجدول إلى صيغة Aramex
 * @param {Object} deliveryData بيانات التسليم
 * @returns {Object} بيانات التسليم بصيغة Aramex
 */
exports.deliveryData = (deliveryData) => {
  return {
    deliveryDateTime: deliveryData.delivery_date_time || Date.now(),
    address: exports.formatAddress(deliveryData.address),
    contactName: deliveryData.contact_name || "غير محدد",
    companyName: deliveryData.company_name || "غير محدد",
    phone: deliveryData.phone || "0000000000",
    mobile: deliveryData.mobile || "0000000000",
    email: deliveryData.email || "test@example.com",
  };
};
