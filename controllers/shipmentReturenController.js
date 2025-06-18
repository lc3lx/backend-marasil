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

module.exports.createReturnShipment = asyncHandler(async (req, res, next) => {
  try {
    const { company, shipment } = req.body;

    // 1. التحقق من البيانات المطلوبة
    if (!company || !shipment) {
      return next(
        new ApiEror("جميع البيانات مطلوبة: company, shipmentData", 400)
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

    // 3. إنشاء الشحنة المرتجعة حسب الشركة
    let returnShipment;
    let shipmentData;
    switch (company) {
      case "smsa":
        shipmentData = smsaServers.ShapmentdataC2b(shipment);
        returnShipment = await smsaExxpress.createReturnShipment(shipmentData);
        break;
      case "aramex":
      // TODO: Implement Aramex return shipment creation when available

      case "redbox":
        // TODO: Implement RedBox return shipment creation when available
        return next(
          new ApiEror("إنشاء الشحنات المرتجعة لـ RedBox غير متوفر حالياً", 501)
        );
      case "omnid":
        // TODO: Implement Omnid return shipment creation when available
        return next(
          new ApiEror("إنشاء الشحنات المرتجعة لـ Omnid غير متوفر حالياً", 501)
        );
      default:
        return next(new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400));
    }

    // 4. حفظ الشحنة في قاعدة البيانات
    const newShipment = await Shapment.create({
      company,
      trackingId: returnShipment.trackingNumber,
      type: "return",
      status: "created",
      details: returnShipment,
    });

    // 5. إرجاع نتيجة إنشاء الشحنة
    res.status(201).json({
      status: "success",
      message: "تم إنشاء الشحنة المرتجعة بنجاح",
      data: {
        shipment: newShipment,
        trackingDetails: returnShipment,
      },
    });
  } catch (error) {
    // 6. معالجة الأخطاء
    console.error(`خطأ في إنشاء الشحنة المرتجعة: ${error.message}`);
    return next(
      new ApiEror(`فشل في إنشاء الشحنة المرتجعة: ${error.message}`, 500)
    );
  }
});

module.exports.cancelReturnShipment = asyncHandler(async (req, res, next) => {
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

    // 3. إلغاء الشحنة المرتجعة حسب الشركة
    let cancellationResult;
    switch (company) {
      case "smsa":
        cancellationResult = await smsaExxpress.cancelReturnShipment(
          trackingNumber
        );
        break;
      case "aramex":
        //  const aramexService = AramexService.;
        // TODO: Implement Aramex return shipment cancellation when available
        return next(
          new ApiEror("إلغاء الشحنات المرتجعة لـ Aramex غير متوفر حالياً", 501)
        );
      case "redbox":
        // TODO: Implement RedBox return shipment cancellation when available
        return next(
          new ApiEror("إلغاء الشحنات المرتجعة لـ RedBox غير متوفر حالياً", 501)
        );
      case "omnid":
        // TODO: Implement Omnid return shipment cancellation when available
        return next(
          new ApiEror("إلغاء الشحنات المرتجعة لـ Omnid غير متوفر حالياً", 501)
        );
      default:
        return next(new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400));
    }

    // 4. تحديث حالة الشحنة المرتجعة في قاعدة البيانات
    await Shapment.findOneAndUpdate(
      { trackingId: trackingNumber },
      { status: "return_cancelled" }
    );

    // 5. إرجاع نتيجة الإلغاء
    res.status(200).json({
      status: "success",
      message: "تم إلغاء الشحنة المرتجعة بنجاح",
      data: cancellationResult,
    });
  } catch (error) {
    // 6. معالجة الأخطاء
    console.error(`خطأ في إلغاء الشحنة المرتجعة: ${error.message}`);
    return next(
      new ApiEror(`فشل في إلغاء الشحنة المرتجعة: ${error.message}`, 500)
    );
  }
});
