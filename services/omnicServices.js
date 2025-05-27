/**
 * تحويل بيانات الاتصال إلى صيغة OmniDelivery
 * @param {Object} contact بيانات الاتصال
 * @returns {Object} بيانات الاتصال بصيغة OmniDelivery
 */
exports.formatContact = (contact) => {
  return {
    company_name: contact.company_name || "غير محدد",
    company_reg_number: contact.company_reg_number || "",
    email: contact.email || "test@example.com",
    name: contact.full_name || "غير محدد",
    phone: contact.phone || "0000000000",
  };
};

/**
 * تحويل بيانات الموقع إلى صيغة OmniDelivery
 * @param {Object} location بيانات الموقع
 * @returns {Object} بيانات الموقع بصيغة OmniDelivery
 */
exports.formatLocation = (location) => {
  return {
    point: {
      address: location.address || "غير محدد",
      city: location.city || "غير محدد",
      country: location.country || "SA",
      coordinates: location.coordinates || { lat: 0, lng: 0 },
      post_code: location.post_code || "",
    },
  };
};

/**
 * تحويل بيانات الشحنة إلى صيغة OmniDelivery
 * @param {Object} order بيانات الطلب
 * @param {Object} shipperAddress عنوان المرسل
 * @param {Object} box أبعاد الصندوق
 * @returns {Object} بيانات الشحنة بصيغة OmniDelivery
 */
exports.shipmentData = (order, shipperAddress, typeOfshipment, box) => {
  return {
    cost: {
      cod_value:
        order.payment_method === "COD"
          ? parseFloat(order.total.amount) || 0
          : 0,
      declared_cost: parseFloat(order.total.amount) || 0,
      services_payment: [],
    },
    delivery_comment: order.delivery_notes || "",
    delivery_options: {
      sending_parcel_locker: order.use_parcel_locker || false,
    },
    description: order.description || "منتجات عامة",
    desired_delivery_at: {
      delivery_date:
        order.delivery_date || new Date().toISOString().split("T")[0],
      delivery_time_start: order.delivery_time_start || "09:00",
      delivery_time_end: order.delivery_time_end || 960,
    },
    direction_type: typeOfshipment, // 0: Delivery (strait) order
    height: box?.height || 0,
    length: box?.length || 0,
    location_from: exports.formatLocation(shipperAddress),
    location_to: exports.formatLocation(order.customer),
    logistician_uid: order.logistician_uid || "",
    number: order.reference_id || "ORD-UNKNOWN",
    places: [
      {
        weight: order.weight || 0,
        length: box?.length || 0,
        width: box?.width || 0,
        height: box?.height || 0,
      },
    ],
    receiver: exports.formatContact(order.customer),
    sender: exports.formatContact(shipperAddress),
    tariff_code: order.tariff_code || "63",
    uid: order.uid || "",
    weight: order.weight || 0,
    width: box?.width || 0,
    initial_status: 11, // Receiver will have to pick some parcel locker
  };
};

/**
 * تحويل بيانات التتبع إلى صيغة OmniDelivery
 * @param {Object} trackingData بيانات التتبع
 * @returns {Object} بيانات التتبع بصيغة OmniDelivery
 */
exports.trackingData = (trackingData) => {
  return {
    order_uid: trackingData.order_uid || "",
    logistician_order_number: trackingData.logistician_order_number || "",
    status_code: trackingData.status_code || 0,
    status_name: trackingData.status_name || "",
    updated_at: trackingData.updated_at || new Date().toISOString(),
  };
};
