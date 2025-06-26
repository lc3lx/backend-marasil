//module import
const mongoose = require("mongoose");
const Shapment = require("../models/shipmentModel");
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
const { createAramexReturnShipment } = require("../services/aramexReturnService");
const { createRedboxReturnShipment } = require("../services/redboxReturnService");
// helpers import
const ApiEror = require("../utils/apiError");
const asyncHandler = require("express-async-handler");
const ReturnShipment = require("../models/returnShipmentModel");
const sendMail = require("../utils/SendMail");
const crypto = require("crypto");
const omnidPlatform = require("../platforms/shipment/omnidPlatform");

// Internal function, not exposed as an endpoint
const _createReturnShipmentInternal = async (shipmentId, smsaRetailId) => {
  const originalShipment = await Shapment.findById(shipmentId).populate(
    "receiverAddress"
  );

  if (!originalShipment) {
    throw new ApiEror(`لم يتم العثور على شحنة بالمعرف ${shipmentId}`, 404);
  }

  const company = originalShipment.shapmentCompany;
  const shippingCompany = await shappingCompany.findOne({ company });

  if (!shippingCompany || shippingCompany.status !== "Enabled") {
    throw new ApiEror(`شركة الشحن ${company} غير متاحة حالياً`, 400);
  }

  let returnShipmentResult;
  let shipmentData;

  switch (company) {
    case "smsa":
      shipmentData = smsaServers.ShapmentdataC2b(
        originalShipment
      );
      returnShipmentResult = await smsaExxpress.createReturnShipment(
        shipmentData
      );
      break;
    case "aramex":
      // استخدام الدالة المخصصة لإنشاء شحنة إرجاع Aramex
      const result = await createAramexReturnShipment(originalShipment, aramex);
      returnShipmentResult = result.aramexResult;
      
      // تحديث البيانات المرجعة
      return {
        newReturnShipment: result.returnShipment,
        returnShipmentResult: result.aramexResult
      };
      
    case "redbox":
      // استخدام الدالة المخصصة لإنشاء شحنة إرجاع Redbox
      const redboxResult = await createRedboxReturnShipment(originalShipment, redbox);
      
      // تحديث البيانات المرجعة
      return {
        newReturnShipment: redboxResult.returnShipment,
        returnShipmentResult: redboxResult.redboxResult
      };
      
    // Add other cases for omnid as needed
    default:
      throw new ApiEror(
        `شركة الشحن ${company} غير مدعومة لعمليات الإرجاع`,
        400
      );
  }

  if (!returnShipmentResult || !returnShipmentResult.trackingNumber) {
    throw new ApiEror("لم يتم إرجاع رقم تتبع من شركة الشحن.", 500);
  }

  const newReturnShipment = await Shapment.create({
    customerId: originalShipment.customerId,
    orderId: originalShipment.orderId,
    senderAddress: originalShipment.senderAddress,
    receiverAddress: originalShipment.receiverAddress._id,
    ordervalue: 0,
    boxNum: originalShipment.boxNum,
    weight: originalShipment.weight,
    orderDescription: `Return for order ${originalShipment.orderId}`,
    paymentMathod: "Prepaid",
    shapmentCompany: company,
    trackingId: returnShipmentResult.trackingNumber,
    storId: originalShipment.storId,
    shapmentType: "reverse",
  });

  return { newReturnShipment, returnShipmentResult };
};

// Exposed endpoint for manual creation by admin
module.exports.createReturnShipment = asyncHandler(async (req, res, next) => {
  const { shipmentId, smsaRetailId } = req.body;
  if (!shipmentId) {
    return next(new ApiEror("معرف الشحنة الأصلي مطلوب.", 400));
  }

  const { newReturnShipment, returnShipmentResult } =
    await _createReturnShipmentInternal(shipmentId, smsaRetailId);

  res.status(201).json({
    status: "success",
    message: "تم إنشاء الشحنة المرتجعة بنجاح",
    data: {
      shipment: newReturnShipment,
      trackingDetails: returnShipmentResult,
    },
  });
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
/**
 * @desc Step 1: Guest enters email, system sends OTP if email is valid.
 */
module.exports.requestEmailOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new ApiEror("يرجى إدخال البريد الإلكتروني", 400));
  }

  //

  // Generate OTP
  const otpCode = crypto.randomInt(100000, 999999).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Save OTP record
  await ReturnShipment.findOneAndUpdate(
    { requestedByEmail: email },
    { otpCode, otpExpires, reqstatus: "pending" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Send email
  try {
    await sendMail({
      to: email,
      subject: "رمز التحقق لطلب الإرجاع/الاستبدال",
      text: `رمز التحقق الخاص بك هو: ${otpCode}. الرمز صالح لمدة 10 دقائق.`,
    });
    res.status(200).json({
      status: "success",
      message: `تم إرسال رمز التحقق إلى ${email}`,
    });
  } catch (error) {
    console.error("Email sending error:", error);
    return next(
      new ApiEror("فشل إرسال البريد الإلكتروني، يرجى المحاولة مرة أخرى", 500)
    );
  }
});

/**
 * @desc Step 2: Guest enters OTP to get verified.
 * This function verifies the OTP and returns a success message if valid.
 */
module.exports.verifyEmailOTP = asyncHandler(async (req, res, next) => {
  const { email, otpCode } = req.body;

  // 1. التحقق من وجود البريد الإلكتروني ورمز التحقق
  if (!email || !otpCode) {
    return next(new ApiEror("يرجى إدخال البريد الإلكتروني ورمز التحقق", 400));
  }

  // 2. البحث عن طلب الإرجاع المرتبط بالبريد الإلكتروني ورمز التحقق
  const returnRequest = await ReturnShipment.findOne({
    requestedByEmail: email,
    otpCode,
    otpExpires: { $gt: new Date() }, // التأكد من أن الرمز لم ينتهِ صلاحيته
  });

  // 3. إذا لم يتم العثور على طلب إرجاع أو انتهت صلاحية الرمز
  if (!returnRequest) {
    return next(new ApiEror("رمز التحقق غير صحيح أو منتهي الصلاحية", 400));
  }

  // 4. مسح رمز OTP بعد التحقق منه بنجاح
  returnRequest.otpCode = undefined;
  returnRequest.otpExpires = undefined;
  await returnRequest.save();

  // 5. إرجاع رسالة نجاح مع البريد الإلكتروني
  res.status(200).json({
    status: "success",
    message: "تم التحقق بنجاح. يمكنك الآن اختيار الشحنة وتقديم طلب الإرجاع أو الاستبدال.",
    email, // إرجاع البريد الإلكتروني للاستخدام في الطلبات اللاحقة
  });
});

// إنشاء طلب استرجاع بعد التحقق من الكود

module.exports.createReturnRequest = asyncHandler(async (req, res, next) => {
  try {
    const { shipmentId, typerequesst, requestNote } = req.body;

    if (!shipmentId  || !typerequesst ) {
      return next(
        new ApiEror(
          "يجب إدخال رقم الشحنة، الإيميل، ونوع الطلب (return أو exchange)",
          400
        )
      );
    }

    if (!["return", "exchange"].includes(typerequesst)) {
      return next(
        new ApiEror("نوع الطلب غير صالح، يجب أن يكون return أو exchange", 400)
      );
    }

    const shipment = await Shapment.findById(shipmentId);
    if (!shipment) {
      return next(new ApiEror("الشحنة غير موجودة", 404));
    }

    let returnReq = await ReturnShipment.findOneAndUpdate(
      {
        shipment: shipmentId,
       
        typerequesst: typerequesst,
      },
      {
        reqstatus: "pending",
        customerId: shipment.customerId,
        requestNote: requestNote || "", // ← إضافتها هنا
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(201).json({
      status: "success",
      message: `تم إنشاء طلب ${
        typerequesst === "return" ? "الاسترجاع" : "الاستبدال"
      } بنجاح، بانتظار موافقة صاحب الشحنة.`,
      data: {
        returnRequestId: returnReq._id,
      },
    });
  } catch (error) {
    return next(new ApiEror(error.message, 500));
  }
});

// موافقة أو رفض صاحب الحساب على طلب الاسترجاع
module.exports.handleReturnApproval = asyncHandler(async (req, res, next) => {
  const { returnRequestId, approve, smsaRetailId } = req.body; // smsaRetailId might be needed
  // if (!returnRequestId || typeof approve === "undefined") {
  //   return next(new ApiEror("يجب إدخال رقم الطلب وحالة الموافقة", 400));
  // }

  const returnReq = await ReturnShipment.findById(returnRequestId);
  if (!returnReq) {
    return next(new ApiEror("طلب الاسترجاع غير موجود", 404));
  }

  if (returnReq.reqstatus !== "pending") {
    return next(new ApiEror("تم التعامل مع هذا الطلب مسبقاً", 400));
  }

  if (approve) {
    // On approval, create the return shipment
    if (!returnReq.shipment) {
      return next(new ApiEror("لا يمكن الموافقة على طلب غير مرتبط بشحنة", 400));
    }

    await _createReturnShipmentInternal(returnReq.shipment, smsaRetailId);

    returnReq.reqstatus = "yes";
    await returnReq.save();

    res.status(200).json({
      status: "success",
      message: "تمت الموافقة على الطلب وإنشاء شحنة الإرجاع بنجاح.",
    });
  } else {
    // On rejection
    returnReq.reqstatus = "no";
    await returnReq.save();
    res.status(200).json({
      status: "success",
      message: "تم رفض طلب الاسترجاع.",
    });
  }
});
// get all re|| exc for users
// الحصول على جميع طلبات الإرجاع للعميل المسجل
// GET /api/v1/shipment/return/my-returns
// يمكن تصفية النتائج حسب نوع الطلب باستخدام ?type=return أو ?type=exchange
module.exports.getAllreturnshipment = asyncHandler(async (req, res, next) => {
  try {
    // إنشاء كائن الفلتر الأساسي
    const filter = { customerId: req.customer._id };
    
    // إضافة فلتر نوع الطلب إذا تم تحديده
    if (req.query.type) {
      filter.typerequesst = req.query.type; // 'return' أو 'exchange'
    }

    // جلب طلبات الإرجاع مع البيانات المرتبطة
    const returnShipments = await ReturnShipment.find(filter)
      .populate({
        path: 'shipment',
        select: 'trackingId status createdAt shapmentCompany',
        populate: {
          path: 'receiverAddress',
          select: 'clientName clientPhone clientEmail clientAddress'
        }
      })
      .sort({ createdAt: -1 }) // الأحدث أولاً
      .lean();

    // تنسيق البيانات المرتجعة
    const formattedReturns = returnShipments.map(item => ({
      _id: item._id,
      status: item.status,
      type: item.typerequesst,
      requestNote: item.requestNote,
      createdAt: item.createdAt,
      shipment: item.shipment ? {
        _id: item.shipment._id,
        trackingId: item.shipment.trackingId,
        status: item.shipment.shipmentstates,
        company: item.shipment.shapmentCompany,
        receiver: item.shipment.receiverAddress ? {
          name: item.shipment.receiverAddress.clientName,
          phone: item.shipment.receiverAddress.clientPhone,
          email: item.shipment.receiverAddress.clientEmail,
          address: item.shipment.receiverAddress.clientAddress
        } : null
      } : null
    }));

    res.status(200).json({
      status: "success",
      count: formattedReturns.length,
      data: formattedReturns
    });

  } catch (error) {
    console.error('Error in getAllreturnshipment:', error);
    next(new ApiEror('حدث خطأ أثناء جلب طلبات الإرجاع', 500));
  }
});

//get one just
module.exports.getoneship = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const returnShipment = await ReturnShipment.findById(id).populate("shipment");

  if (!returnShipment) {
    return next(new ApiEror(`لا يوجد طلب بهذا الرقم ${id}`, 404));
  }

  res.status(200).json({
    status: "success",
    data: returnShipment,
  });
});

// get a all shipmnet for customer

module.exports.getShipmentsByReceiver = asyncHandler(async (req, res) => {
  const { email, phone } = req.query;
  
  console.log('Searching shipments for:', { email, phone });
  
  if (!email && !phone) {
    return res.status(400).json({ 
      status: "error",
      message: "يرجى إرسال الإيميل أو رقم الجوال للبحث." 
    });
  }

  try {
    // 1. البحث أولاً عن العناوين التي تطابق البريد الإلكتروني أو رقم الهاتف
    const ClientAddress = mongoose.model('ClientAddress');
    const addressQuery = {};
    
    if (email) addressQuery.clientEmail = email;
    if (phone) addressQuery.clientPhone = phone;

    console.log('Searching addresses with query:', JSON.stringify(addressQuery));
    
    const addresses = await ClientAddress.find(addressQuery).select('_id email phone');
    
    console.log('Found addresses:', JSON.stringify(addresses));
    
    if (addresses.length === 0) {
      console.log('No addresses found for the given email/phone');
      return res.status(200).json({
        status: "success",
        results: 0,
        message: "لا توجد شحنات لهذا المستخدم"
      });
    }

    // 2. البحث عن الشحنات التي تحتوي على هذه العناوين
    const addressIds = addresses.map(addr => addr._id);
    
    console.log('Searching shipments for address IDs:', addressIds);
    
    // إزالة فلتر isReturnable مؤقتاً للتحقق
    const shipments = await Shapment.find({
      receiverAddress: { $in: addressIds },
      // isReturnable: true,
      // $or: [
      //   { returnDeadline: { $exists: false } },
      //   { returnDeadline: { $gte: new Date() } }
      // ]
    })
    .populate('receiverAddress')
    .sort({ createdAt: -1 })
    .lean();

    console.log(`Found ${shipments.length} shipments before filtering`);

    if (shipments.length === 0) {
      console.log('No shipments found for the addresses');
      return res.status(200).json({
        status: "success",
        results: 0,
        message: "لا توجد شحنات مسجلة لهذا المستخدم"
      });
    }

    // 3. تصفية الشحنات التي لا تحتوي على عنوان
    const validShipments = shipments.filter(shipment => {
      const isValid = shipment.receiverAddress !== null;
      if (!isValid) {
        console.log('Shipment has no receiverAddress:', shipment._id);
      }
      return isValid;
    });

    console.log(`Found ${validShipments.length} valid shipments with receiver addresses`);

    if (validShipments.length === 0) {
      console.log('No valid shipments with receiver addresses found');
      return res.status(200).json({
        status: "success",
        results: 0,
        message: "لا توجد شحنات صالحة للعرض"
      });
    }

    // 4. تنسيق البيانات المرتجعة
    const formattedShipments = validShipments.map(shipment => {
      console.log('Processing shipment:', shipment._id, 'with receiver:', shipment.receiverAddress);
      return {
        _id: shipment._id,
        trackingId: shipment.trackingId,
        status: shipment.shipmentstates,
        orderId: shipment.orderId,
        createdAt: shipment.createdAt,
        receiverAddress: {
          _id: shipment.receiverAddress?._id,
          name: shipment.receiverAddress?.name,
          phone: shipment.receiverAddress?.phone,
          email: shipment.receiverAddress?.email,
          address: shipment.receiverAddress?.address
        },
        isReturnable: shipment.isReturnable,
        returnDeadline: shipment.returnDeadline,
        shipmentCompany: shipment.shapmentCompany
      };
    });

    console.log(`Returning ${formattedShipments.length} formatted shipments`);

    res.status(200).json({
      status: "success",
      results: formattedShipments.length,
      data: formattedShipments
    });

  } catch (error) {
    console.error("Error in getShipmentsByReceiver:", error);
    res.status(500).json({ 
      status: "error",
      message: error.message || "حدث خطأ أثناء البحث عن الشحنات"
    });
  }
});
