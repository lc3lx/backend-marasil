const ShippingCompanySchema = new mongoose.Schema({
  // بيانات البلدان
  countries: {
    fromCountry: { type: String, required: true },
    toCountry: { type: String, required: true },
  },

  // بيانات الشركة
  company: {
    name: {
      type: String,
      enum: ["smsa", "redbox", "omniclama", "aramex"],
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function (value) {
          const company = this.company.name;
          switch (company) {
            case "smsa":
              return (
                value.api_key &&
                value.b2b_key &&
                value.username &&
                value.account_number &&
                value.password
              );
            case "redbox":
              return value.token;
            case "omniclama":
              return value.username && value.password;
            case "aramex":
              return (
                value.username &&
                value.password &&
                value.account_number &&
                value.pin &&
                value.entity &&
                value.version
              );
            default:
              return true;
          }
        },
        message: "Invalid credentials for {VALUE}",
      },
    },
  },

  // إعدادات الشحن
  settings: {
    byoc: { type: Boolean, required: true },
    COD: { type: Boolean, required: true },
    maxCodAmount: { type: Number, required: true },
    maxWeight: { type: Number, required: true }, // الحد الأقصى للوزن
    maxBoxes: { type: Number, required: true }, // الحد الأقصى لعدد الصناديق
    pricingType: {
      type: String,
      enum: ["contract", "customer_account"],
      required: true,
    },
    basePrice: { type: Number }, // السعر الأساسي (للمتعاقدين فقط)
    fixedFee: { type: Number }, // الرسوم الثابتة (لحسابات العملاء)
    RTOprice: { type: Number }, // رسوم الإرجاع
    ValueAddedTax: { type: Number, default: 0.15 }, // ضريبة القيمة المضافة
  },

  // أنواع الشحن
  shippingTypes: [
    {
      type: String,
      enum: ["Normal", "Cold", "Quick", "Box"],
      required: true,
    },
  ],

  // أسعار الشحن بناءً على الوزن
  weightPricing: [
    {
      weightRangeStart: { type: Number, required: true },
      weightRangeEnd: { type: Number, required: true },
      fixedPrice: { type: Number, required: true },
      additionalPricePerKg: { type: Number, required: true },
    },
  ],

  // الحد الأدنى لعدد الشحنات
  minShipments: { type: Number, required: true },

  // حالة الشركة
  status: {
    type: String,
    required: true,
    enum: ["Enabled", "Disabled"],
  },

  // معلومات إضافية
  shipperGroup: {
    type: String,
    required: true,
    enum: ["Fastcoo", "Fizzpa", "LogesTechs", "Shipox", "Shipsy"],
  },
  conditions: { type: String, required: true },
  details: { type: String, required: true },
  conditionsAr: { type: String, required: true },
  detailsAr: { type: String, required: true },
  trackingURL: { type: String },
  pickUpStatus: {
    type: String,
    required: true,
    enum: ["Yes", "No"],
  },
  deliveryPromiseType: {
    type: String,
    required: true,
    enum: ["Static"],
  },
});
