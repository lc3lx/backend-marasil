module.exports.shipmentnorm = (shippingType, orderData) => {
  // التحقق من صحة المدخلات
  if (!shippingType || !orderData) {
    throw new Error("البيانات غير مكتملة");
  }

  // حساب التكلفة الأساسية
  const baseCost = shippingType.basePrice + shippingType.profitPrice;

  // حساب تكلفة الوزن الإضافي
  const additionalWeightCost = calculateAdditionalWeightCost(
    orderData.weight,
    shippingType.maxWeight,
    shippingType.baseAdditionalweigth,
    shippingType.profitAdditionalweigth
  );

  // حساب رسوم الدفع عند الاستلام
  const codFees =
    orderData.paymentMethod === "COD"
      ? shippingType.baseCODfees + shippingType.profitCODfees
      : 0;

  // حساب المجموع قبل الضريبة
  const subtotal = baseCost + additionalWeightCost + codFees;

  // حساب الضريبة
  const tax = subtotal * shippingType.priceaddedtax;

  // المجموع النهائي
  const total = subtotal + tax;

  return {
    breakdown: {
      baseCost,
      additionalWeightCost,
      codFees,
      subtotal,
      tax,
    },
    total,
  };
};

// ✅ تحقق من المدخلات
function validateInputs(shippingType, order) {
  if (!shippingType) throw new Error("Company data is missing");
  if (!Array.isArray(shippingType.type))
    throw new Error("Shipping types are missing");
  if (!order?.shippingType) throw new Error("Shipping type is required");
  if (!order?.paymentMethod) throw new Error("Payment method is required");
  if (typeof order.weight !== "number" || order.weight <= 0)
    throw new Error("Invalid weight value");
}

// 📦 حساب تكلفة الوزن الزائد
function calculateAdditionalWeightCost(
  weight,
  maxWeight,
  baseAdditional,
  profitAdditional
) {
  if (weight <= maxWeight) return 0;
  const extra = Math.ceil(weight - maxWeight);
  return extra * (baseAdditional + profitAdditional);
}
