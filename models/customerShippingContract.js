const mongoose = require("mongoose");

const customerShippingContractSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shippingCompany: {
      type: String,
      enum: ["smsa", "aramex", "redbox", "omnilama"],
      required: true,
    },
    // أسعار العقد للشركات التي تعتمد على الوزن
    weightBasedPrices: [{
      minWeight: { type: Number, required: true },
      maxWeight: { type: Number, required: true },
      price: { type: Number, required: true }
    }],
    extraWeightPrice: {
      type: Number,
      default: 0
    },
    // أسعار العقد للشركات التي تعتمد على الصناديق
    boxBasedPrices: [{
      boxSize: { type: String, required: true },
      price: { type: Number, required: true }
    }],
    // رسوم الدفع عند الاستلام حسب العقد
    contractCodFees: {
      type: Number,
      default: 0
    },
    // الربح الثابت على كل شحنة
    profitPerShipment: {
      type: Number,
      required: true,
      description: "الربح الثابت على كل شحنة للعقود الخاصة"
    },
    // الربح على الوزن الزائد
    extraWeightProfit: {
      type: Number,
      default: 0,
      description: "الربح على كل كيلو زائد للعقود الخاصة"
    },
    // الربح على رسوم الدفع عند الاستلام
    codFeesProfit: {
      type: Number,
      default: 0,
      description: "الربح على رسوم الدفع عند الاستلام للعقود الخاصة"
    },
    isActive: {
      type: Boolean,
      default: true
    },
    contractNumber: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
  }
);

// إضافة مؤشرات للبحث السريع
customerShippingContractSchema.index({ customer: 1, shippingCompany: 1 });
customerShippingContractSchema.index({ contractNumber: 1 });

const CustomerShippingContract = mongoose.model(
  "CustomerShippingContract",
  customerShippingContractSchema
);

module.exports = CustomerShippingContract;
