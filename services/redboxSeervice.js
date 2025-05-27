/**
 * تحويل بيانات الشحنة إلى صيغة RedBox
 * @param {Object} order بيانات الطلب
 * @param {Object} shipperAddress عنوان المرسل
 * @returns {Object} بيانات الشحنة بصيغة RedBox
 */
exports.shipmentdata = (order, shipperAddress) => {
  const shipmentdata = {
    reference: order.reference_id || "ORD-UNKNOWN",
    cod_amount:
      order.payment_method === "COD" ? parseFloat(order.total.amount) || 0 : 0,
    cod_currency: "SAR",
    customer_address: order.customer.addressLine1 || "غير محدد",
    customer_address_coordinates: order.customer.coordinates || "",
    customer_city: order.customer.city || "غير محدد",
    customer_country: order.customer.country || "SA",
    customer_email: order.customer.email || "",
    customer_name: order.customer.full_name || "غير محدد",
    customer_phone: order.customer.phone || "0000000000",
    dimension_height: box?.height || 0,
    dimension_length: box?.length || 0,
    dimension_width: box?.width || 0,
    dimension_unit: "CM",
    weight_value: order.weight || 0,
    weight_unit: "KG",
    package_count: order.package_count || 1,
    from_platform: order.platform || "unknown",
    pickup_location_id: shipperAddress.location_id || "",
    pickup_location_reference: shipperAddress.reference || "",
    point_id: shipperAddress.point_id || "",
    sender_address: shipperAddress.addressLine1 || "غير محدد",
    sender_email: shipperAddress.email || "",
    sender_name: shipperAddress.full_name || "غير محدد",
    sender_phone: shipperAddress.phone || "0000000000",
    shipping_price: order.shipping_cost || 0,
    shipping_price_currency: "SAR",
    original_tracking_number: order.tracking_number || "",
  };

  return shipmentdata;
};
