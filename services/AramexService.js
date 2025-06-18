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
 * @param {Number} weight الوزن
 * @param {Number} Parcels عدد الطرود
 * @param {String} orderDescription وصف الطلب
 * @param {Object} dimension الأبعاد
 * @returns {Object} بيانات الشحنة بصيغة Aramex
 */
exports.shipmentData = (
  order,
  shipperAddress,
  weight,
  Parcels,
  orderDescription,
  dimension = {}
) => {
  // التحقق من البيانات المطلوبة
  if (!order || !shipperAddress || !weight || !Parcels) {
    throw new Error(
      "جميع البيانات مطلوبة: order, shipperAddress, weight, Parcels"
    );
  }

  // التأكد من أن الوزن وعدد الطرود أرقام صحيح
  if (isNaN(weight) || weight <= 0) {
    throw new Error("الوزن يجب أن يكون رقماً موجباً");
  }

  if (isNaN(Parcels) || Parcels <= 0) {
    throw new Error("عدد الطرود يجب أن يكون رقماً موجباً");
  }

  return {
    ClientInfo: {
      UserName: process.env.ARAMEX_USERNAME,
      Password: process.env.ARAMEX_PASSWORD,
      Version: "v1.0",
      AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
      AccountPin: process.env.ARAMEX_ACCOUNT_PIN,
      AccountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || "JED",
      AccountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE || "SA",
    },
    Shipments: [
      {
        Reference1: order.reference_id || `ORD-${Date.now()}`,
        Reference2: order.order_number || "",
        Reference3: order.platform || "",
        Reference4: "",
        Reference5: "",
        Shipper: {
          Reference1: shipperAddress.reference || "Ref1",
          Address: exports.formatAddress(shipperAddress),
          Contact: {
            PersonName: shipperAddress.full_name || "غير محدد",
            CompanyName: shipperAddress.company_name || "غير محدد",
            PhoneNumber1: shipperAddress.phone || "0000000000",
            CellPhone: shipperAddress.mobile || "0000000000",
            EmailAddress: shipperAddress.email || "test@example.com",
          },
        },
        Consignee: {
          Reference1: order.customer?.reference || "Ref2",
          Address: exports.formatAddress(order.customer),
          Contact: {
            PersonName: order.customer?.full_name || "غير محدد",
            CompanyName: order.customer?.company_name || "غير محدد",
            PhoneNumber1: order.customer?.phone || "0000000000",
            CellPhone: order.customer?.mobile || "0000000000",
            EmailAddress: order.customer?.email || "test@example.com",
          },
        },
        ThirdParty: null,
        ShippingDateTime: new Date().toISOString(),
        DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        Comments: orderDescription || order.description || "منتجات عامة",
        PickupLocation: "",
        OperationsInstructions: "",
        AccountingIninstructions: "",
        Details: {
          Dimensions: {
            Length: dimension.length || 10,
            Width: dimension.width || 10,
            Height: dimension.height || 10,
            Unit: "cm",
          },
          ActualWeight: {
            Value: weight,
            Unit: "KG",
          },
          ChargeableWeight: {
            Value: weight,
            Unit: "KG",
          },
          DescriptionOfGoods:
            orderDescription || order.description || "منتجات عامة",
          GoodsOriginCountry: "SA",
          NumberOfPieces: Parcels,
          ProductGroup: "EXP",
          ProductType: "PDX",
          PaymentType: order.payment_method === "COD" ? "P" : "C",
          PaymentOptions: order.payment_method === "COD" ? "CASH" : "PREPAID",
          Services: "",
          ItemCount: order.items?.length || 1,
          CustomsValueAmount: {
            Value: parseFloat(order.total || 0),
            CurrencyCode: "SAR",
          },
        },
        Attachments: [],
        ForeignHAWB: "",
        TransportType: 0,
        PickupGUID: "",
        Number: "",
        ScheduledDelivery: null,
      },
    ],
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
