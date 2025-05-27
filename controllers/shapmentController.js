//module import
const Shapment = require("../models/shapmentModel");
const Order = require("../models/Order");
const shappingCompany = require("../models/shipping_company");
const Wallet = require("../models/walletModel");
const customer = require("../models/customerModel");
//platforms import
const smsaExxpress = require("../platforms/shipment/smsaExpressPlatform");
const redbox = require("../platforms/shipment/redboxPlatform");
const aramex = require("../platforms/shipment/aramexPlatform");
const omin = require("../platforms/shipment/omnidPlatform");
//servers import
const { shipmentnorm } = require("../services/shipmentAccount");
const smsaServers = require("../services/smsaService");
const redboxServers = require("../services/redboxSeervice");
const ominServers = require("../services/omnicServices");
const aramxServers = require("../services/AramexService");
// helpers import
const ApiEror = require("../utils/apiError");
const asyncHandler = require("express-async-handler");
/*
MATHOD : POST
THIS MOTHOD FOR CREATE SHIPMENT 

*/
module.exports.createShapment = asyncHandler(async (req, res, next) => {
  try {
    const {
      company,
      order,
      shipperAddress,
      weight,
      Parcels,
      shipmentType,
      orderDescription,
    } = req.body;

    // 1. التحقق من البيانات المطلوبة
    if (
      !company ||
      !order ||
      !shipperAddress ||
      !shipmentType ||
      !weight ||
      !Parcels
    ) {
      return next(
        new ApiEror(
          "جميع البيانات مطلوبة: company, order, shipperAddress, shipmentType, weight, Parcels",
          400
        )
      );
    }

    // 2. جلب بيانات شركة الشحن والتحقق من صلاحيتها
    const shippingCompany = await shappingCompany.findOne({ company });
    if (!shippingCompany) {
      return next(new ApiEror(`شركة الشحن ${company} غير موجودة`, 404));
    }
    if (shippingCompany.status !== "Enabled") {
      return next(new ApiEror(`شركة الشحن ${company} غير مفعلة حالياً`, 400));
    }

    // 3. التحقق من نوع الشحن المطلوب
    const shippingType = shippingCompany.shippingTypes.find(
      (t) => t.type === shipmentType
    );
    if (!shippingType) {
      return next(
        new ApiEror(`نوع الشحن ${shipmentType} غير متوفر مع ${company}`, 400)
      );
    }

    // 4. التحقق من قيود الوزن والطرود
    if (weight > shippingType.maxWeight) {
      return next(
        new ApiEror(
          `الوزن يتجاوز الحد الأقصى المسموح به (${shippingType.maxWeight} كجم)`,
          400
        )
      );
    }
    if (Parcels > shippingType.maxBoxes) {
      return next(
        new ApiEror(
          `عدد الطرود يتجاوز الحد الأقصى المسموح به (${shippingType.maxBoxes})`,
          400
        )
      );
    }

    // 5. حساب تكلفة الشحن
    const pricing = shipmentnorm(shippingCompany, {
      weight,
      shippingType: shipmentType,
      paymentMethod: order.payment_method,
    });
    const wallet = await Wallet.findOne(req.customer._id);
    if (wallet.balance < pricing.total) {
      return next(
        new ApiEror("no mony have for the shipment plese charging again ", 402)
      );
    }
    wallet.balance -= pricing.total;
    await wallet.save();

    // 6. إنشاء الشحنة حسب الشركة
    let trackingInfo;
    let shipmentData;
    switch (company) {
      case "smsa":
        shipmentData = smsaServers.Shapmentdata(
          shippingCompany.code,
          order,
          shipperAddress,
          weight,
          Parcels,
          orderDescription
        );
        trackingInfo = await smsaExxpress.createShipment(shipmentData);
        break;
      case "redbox":
        shipmentData = redboxServers.shipmentdata(
          order,
          shipperAddress,
          weight,
          Parcels,
          orderDescription
        );
        trackingInfo = await redbox.createShipment(shipmentData);
        break;
      case "aramex":
        shipmentData = aramxServers.shipmentData(
          order,
          shipperAddress,
          weight,
          Parcels,
          orderDescription
        );
        trackingInfo = await aramex.createShipment(shipmentData);
        break;
      case "ominlma":
        shipmentData = ominServers.shipmentData(
          order,
          shipperAddress,
          weight,
          Parcels,
          orderDescription
        );
        trackingInfo = await omin.createShipment(shipmentData);
        break;
    }

    // 7. حفظ بيانات الشحنة
    const shipment = new Shapment({
      receiverAddress: order.customer_address,
      ordervalue: order.total.amount,
      orderId: order._id,
      senderAddress: shipperAddress,
      boxNum: Parcels,
      weight,
      dimension: req.body.dimension || {},
      orderDescription: order.description || "",
      paymentMathod: order.payment_method,
      shapmentingType: shipmentType,
      shapmentCompany: company,
      trackingId: trackingInfo.trackingNumber,
      storId: order.store_id,
      shapmentType: "straight",
      shapmentPrice: pricing.total,
      orderSou: order.platform,
      ...shippingType, // نسخ جميع الأسعار والرسوم من نوع الشحن
    });

    await shipment.save();

    // 8. تحديث حالة الطلب
    await Order.findByIdAndUpdate(order._id, { status: "shipped" });

    res.status(201).json({
      status: "success",
      data: {
        shipment,
        tracking: {
          number: trackingInfo.trackingNumber,
          url: `${shippingCompany.trackingURL}${trackingInfo.trackingNumber}`,
        },
      },
    });
  } catch (error) {
    return next(
      new ApiEror(error.message || "حدث خطأ أثناء إنشاء الشحنة", 500)
    );
  }
});

/*
MAthod // GEt 
TRICKING THE SIPMENT USE THE TRACK NUMBER IN HEDERS 
*/

module.exports.trackingShipment = asyncHandler(async (req, res, next) => {
  try {
    const { company, trackingNumber } = req.body;

    // 1. التحقق من البيانات المطلوبة
    if (!company || !trackingNumber) {
      return next(
        new ApiEror("جميع البيانات مطلوبة: company, trackingNumber", 400)
      );
    }

    // 2. جلب بيانات شركة الشحن والتحقق من صلاحيتها
    const shippingCompany = await shappingCompany.findOne({ company });
    if (!shippingCompany) {
      return next(new ApiEror(`شركة الشحن ${company} غير موجودة`, 404));
    }
    if (shippingCompany.status !== "Enabled") {
      return next(new ApiEror(`شركة الشحن ${company} غير مفعلة حالياً`, 400));
    }

    // 3. تتبع الشحنة حسب الشركة
    let trackingResult;
    switch (company) {
      case "smsa":
        trackingResult = await smsaExxpress.trackShipment(trackingNumber);
        break;
      case "aramex":
        trackingResult = await aramex.trackShipment(trackingNumber);
        break;
      case "redbox":
        trackingResult = await redbox.trackShipment(trackingNumber);
        break;
      case "omnid":
        trackingResult = await omin.trackShipment(trackingNumber);

      //    trackingResult = await omin.
      default:
        return next(new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400));
    }

    // 4. إرجاع نتيجة التتبع
    res.status(200).json({
      status: "success",
      data: trackingResult,
    });
  } catch (error) {
    // 5. معالجة الأخطاء
    console.error(`خطأ في تتبع الشحنة: ${error.message}`);
    return next(new ApiEror(`فشل في تتبع الشحنة: ${error.message}`, 500));
  }
});
/*
MATHOD : POST
THIS MOTHOD FOR CANCEL SHIPMENT 

*/
module.exports.cancelShipment = asyncHandler(async (req, res, next) => {
  try {
    const { company, trackingNumber } = req.body;

    // 1. التحقق من البيانات المطلوبة
    if (!company || !trackingNumber) {
      return next(
        new ApiEror("جميع البيانات مطلوبة: company, trackingNumber", 400)
      );
    }

    // 2. جلب بيانات شركة الشحن والتحقق من صلاحيتها
    const shippingCompany = await shappingCompany.findOne({ company });
    if (!shippingCompany) {
      return next(new ApiEror(`شركة الشحن ${company} غير موجودة`, 404));
    }
    if (shippingCompany.status !== "Enabled") {
      return next(new ApiEror(`شركة الشحن ${company} غير مفعلة حالياً`, 400));
    }

    // 3. إلغاء الشحنة حسب الشركة
    let cancellationResult;
    switch (company) {
      case "smsa":
        // SMSA only supports canceling return shipments
        cancellationResult = await smsaExxpress.cancelShipment(trackingNumber);
        break;
      case "aramex":
        return next(new ApiEror("إلغاء شحنات aramex غير متوفر حالياً", 501));

      case "redbox":
        cancellationResult = await redbox.cancelShipment(trackingNumber);
        break;
      case "omnid":
        cancellationResult = await omin.cancelShipment(trackingNumber);
        break;
      default:
        return next(new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400));
    }

    // 4. تحديث حالة الشحنة في قاعدة البيانات
    await Shapment.findOneAndUpdate(
      { trackingId: trackingNumber },
      { status: "cancelled" }
    );

    // 5. إرجاع نتيجة الإلغاء
    res.status(200).json({
      status: "success",
      message: "تم إلغاء الشحنة بنجاح",
      data: cancellationResult,
    });
  } catch (error) {
    // 6. معالجة الأخطاء
    console.error(`خطأ في إلغاء الشحنة: ${error.message}`);
    return next(new ApiEror(`فشل في إلغاء الشحنة: ${error.message}`, 500));
  }
});

/*
M
*/

module.exports.printShipmentInvoice = asyncHandler(async (req, res, next) => {
  try {
    const { company, trackingNumber, items, options } = req.body;

    // 1. التحقق من البيانات المطلوبة
    if (
      !company ||
      !trackingNumber ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return next(
        new ApiEror(
          "جميع البيانات مطلوبة: company, trackingNumber, items[]",
          400
        )
      );
    }

    // 2. جلب بيانات شركة الشحن والتحقق من صلاحيتها
    const shippingCompany = await shappingCompany.findOne({ company });
    if (!shippingCompany) {
      return next(new ApiEror(`شركة الشحن ${company} غير موجودة`, 404));
    }
    if (shippingCompany.status !== "Enabled") {
      return next(new ApiEror(`شركة الشحن ${company} غير مفعلة حالياً`, 400));
    }

    // 3. طباعة الفاتورة حسب الشركة
    let invoiceResult;
    switch (company) {
      case "smsa":
        invoiceResult = await smsaExxpress.pushShipmentInvoice(
          trackingNumber,
          items,
          options
        );
        break;
      case "aramex":
        const aramexService = new Aramex();
        // TODO: Implement Aramex invoice printing when available
        return next(
          new ApiEror("طباعة الفواتير لـ Aramex غير متوفرة حالياً", 501)
        );
      case "redbox":
        // TODO: Implement RedBox invoice printing when available
        return next(
          new ApiEror("طباعة الفواتير لـ RedBox غير متوفرة حالياً", 501)
        );
      case "omnid":
        // TODO: Implement Omnid invoice printing when available
        return next(
          new ApiEror("طباعة الفواتير لـ Omnid غير متوفرة حالياً", 501)
        );
      default:
        return next(new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400));
    }

    // 4. تحديث حالة الشحنة في قاعدة البيانات
    await Shapment.findOneAndUpdate(
      { trackingId: trackingNumber },
      { $set: { "details.invoice": invoiceResult } }
    );

    // 5. إرجاع نتيجة طباعة الفاتورة
    res.status(200).json({
      status: "success",
      message: "تم طباعة الفاتورة بنجاح",
      data: invoiceResult,
    });
  } catch (error) {
    // 6. معالجة الأخطاء
    console.error(`خطأ في طباعة الفاتورة: ${error.message}`);
    return next(new ApiEror(`فشل في طباعة الفاتورة: ${error.message}`, 500));
  }
});
