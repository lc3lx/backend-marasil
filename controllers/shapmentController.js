//module import
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
// helpers import
const ApiEror = require("../utils/apiError");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
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

    // 3. ا
    // لتحقق من نوع الشحن المطلوب

    const shippingType = shippingCompany.shippingTypes.find(
      (t) => t.type === shipmentType
    );

    if (shippingType.type === null) {
      console.log(shippingType.type);
      return next(
        new ApiEror(
          `نوع الشحن ${shipmentType.type} غير متوفر مع ${company}`,
          400
        )
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
    const orderWithWeight = {
      ...order,
      weight: weight,
      paymentMethod: order.payment_method,
    };
    const pricing = shipmentnorm(shippingType, orderWithWeight);

    const wallet = await Wallet.findOne({ customerId: req.customer._id });
    // console.log(wallet.balance);
    // if (wallet.balance  pricing.total) {
    //   return next(
    //     new ApiEror("no mony have for the shipment plese charging again ", 402)
    //   );
    // }
    // wallet.balance = wallet.balance - pricing.total;
    // await wallet.save();

    // 6. إنشاء الشحنة حسب الشركة
    let trackingInfo;
    let shipmentData;

    switch (company) {
      case "smsa":
        console.log(req.body);
        shipmentData = smsaServers.Shapmentdata(
          order,
          shipperAddress,
          weight,
          Parcels,
          orderDescription,
          shippingCompany.code
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
          orderDescription,
          req.body.dimension
        );
        try {
          trackingInfo = await aramex.createShipment(shipmentData);
          if (!trackingInfo || !trackingInfo.trackingNumber) {
            throw new Error("فشل في الحصول على رقم التتبع");
          }
        } catch (error) {
          console.error("Aramex Error:", error);
          return next(
            new ApiEror(`فشل في إنشاء الشحنة: ${error.message}`, 500)
          );
        }
        break;
      case "omniclama":
        shipmentData = ominServers.shipmentData(
          order,
          shipperAddress,
          weight,
          Parcels,
          orderDescription
        );
        try {
          trackingInfo = await omin.createShipment(shipmentData);
          if (!trackingInfo || !trackingInfo.trackingNumber) {
            throw new Error("فشل في الحصول على رقم التتبع");
          }
        } catch (error) {
          console.error("OmniDelivery Error:", error);
          return next(
            new ApiEror(`فشل في إنشاء الشحنة: ${error.message}`, 500)
          );
        }
        break;
    }

    // 7. حفظ بيانات الشحنة
    const shipment = new Shapment({
      receiverAddress: order.customer_address,
      ordervalue: order.total.amount,
      customerId: req.customer._id,
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

/*
METHOD: GET
GET ALL SHIPMENTS FOR A SPECIFIC CUSTOMER
*/
module.exports.getCustomerShipments = asyncHandler(async (req, res, next) => {
  try {
    const customerId = req.customer._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const shipments = await Shapment.find({ customerId })
      .populate("customerId", "firstName lastName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Shapment.countDocuments({ customerId });

    res.status(200).json({
      status: "success",
      results: shipments.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
      data: shipments,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في جلب الشحنات: ${error.message}`, 500));
  }
});

/*
METHOD: GET
GET SINGLE SHIPMENT BY ID
*/
module.exports.getShipment = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const customerId = req.customer._id;

    const shipment = await Shapment.findOne({ _id: id, customerId }).populate(
      "customerId",
      "firstName lastName email phone"
    );

    if (!shipment) {
      return next(new ApiEror("الشحنة غير موجودة", 404));
    }

    res.status(200).json({
      status: "success",
      data: shipment,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في جلب الشحنة: ${error.message}`, 500));
  }
});

/*
METHOD: GET (ADMIN ONLY)
GET ALL SHIPMENTS FOR ALL CUSTOMERS
*/
module.exports.getAllShipments = asyncHandler(async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    if (req.query.status) {
      filter.shipmentStatus = req.query.status;
    }

    if (req.query.shipper) {
      filter.shipper = req.query.shipper;
    }

    if (req.query.paymentMethod) {
      filter.paymentMethod = req.query.paymentMethod;
    }

    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const shipments = await Shapment.find(filter)
      .populate(
        "customerId",
        "firstName lastName email phone company_name_ar company_name_en"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Shapment.countDocuments(filter);

    res.status(200).json({
      status: "success",
      results: shipments.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
      data: shipments,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في جلب الشحنات: ${error.message}`, 500));
  }
});

/*
METHOD: GET (ADMIN ONLY)
GET SINGLE SHIPMENT BY ID (ADMIN VERSION)
*/
module.exports.getShipmentAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    const shipment = await Shapment.findById(id).populate(
      "customerId",
      "firstName lastName email phone company_name_ar company_name_en"
    );

    if (!shipment) {
      return next(new ApiEror("الشحنة غير موجودة", 404));
    }

    res.status(200).json({
      status: "success",
      data: shipment,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في جلب الشحنة: ${error.message}`, 500));
  }
});

/*
METHOD: PUT (ADMIN ONLY)
UPDATE SHIPMENT BY ADMIN
*/
module.exports.updateShipment = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.customerId;
    delete updateData.trackingId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const shipment = await Shapment.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("customerId", "firstName lastName email phone");

    if (!shipment) {
      return next(new ApiEror("الشحنة غير موجودة", 404));
    }

    res.status(200).json({
      status: "success",
      message: "تم تحديث الشحنة بنجاح",
      data: shipment,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في تحديث الشحنة: ${error.message}`, 500));
  }
});

/*
METHOD: DELETE (ADMIN ONLY)
DELETE SHIPMENT BY ADMIN
*/
module.exports.deleteShipment = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    const shipment = await Shapment.findByIdAndDelete(id);

    if (!shipment) {
      return next(new ApiEror("الشحنة غير موجودة", 404));
    }

    res.status(200).json({
      status: "success",
      message: "تم حذف الشحنة بنجاح",
    });
  } catch (error) {
    return next(new ApiEror(`فشل في حذف الشحنة: ${error.message}`, 500));
  }
});

/*
METHOD: GET
SEARCH SHIPMENTS BY VARIOUS CRITERIA
*/
module.exports.searchShipments = asyncHandler(async (req, res, next) => {
  try {
    const { trackingNumber, phone, email, shipmentId, customerId } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};

    // Search by tracking number
    if (trackingNumber) {
      filter.trackingId = { $regex: trackingNumber, $options: "i" };
    }

    // Search by shipment ID
    if (shipmentId) {
      filter._id = shipmentId;
    }

    // Search by customer ID
    if (customerId) {
      filter.customerId = customerId;
    }

    // Search by customer phone or email
    if (phone || email) {
      const customerFilter = {};
      if (phone) customerFilter.phone = { $regex: phone, $options: "i" };
      if (email) customerFilter.email = { $regex: email, $options: "i" };

      const customers = await customer.find(customerFilter).select("_id");
      const customerIds = customers.map((c) => c._id);

      if (customerIds.length > 0) {
        filter.customerId = { $in: customerIds };
      } else {
        // If no customers found, return empty result
        return res.status(200).json({
          status: "success",
          results: 0,
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
          },
          data: [],
        });
      }
    }

    // If no search criteria provided, return error
    if (Object.keys(filter).length === 0) {
      return next(new ApiEror("يجب توفير معيار بحث واحد على الأقل", 400));
    }

    const shipments = await Shapment.find(filter)
      .populate(
        "customerId",
        "firstName lastName email phone company_name_ar company_name_en"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Shapment.countDocuments(filter);

    res.status(200).json({
      status: "success",
      results: shipments.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
      data: shipments,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في البحث عن الشحنات: ${error.message}`, 500));
  }
});

/*
METHOD: GET
GET SHIPMENT STATISTICS FOR CUSTOMER
*/
module.exports.getShipmentsStats = asyncHandler(async (req, res, next) => {
  try {
    const customerId = req.customer._id;

    const stats = await Shapment.aggregate([
      { $match: { customerId: customerId } },
      {
        $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          totalValue: { $sum: "$orderValue" },
          totalShippingCost: { $sum: "$shippingPrice" },
          pendingShipments: {
            $sum: {
              $cond: [{ $eq: ["$shipmentStatus", "READY_FOR_PICKUP"] }, 1, 0],
            },
          },
          deliveredShipments: {
            $sum: {
              $cond: [{ $eq: ["$shipmentStatus", "DELIVERED"] }, 1, 0],
            },
          },
          inTransitShipments: {
            $sum: {
              $cond: [
                {
                  $in: ["$shipmentStatus", ["IN_TRANSIT", "OUT_FOR_DELIVERY"]],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const shipperStats = await Shapment.aggregate([
      { $match: { customerId: customerId } },
      {
        $group: {
          _id: "$shipper",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      totalShipments: stats[0]?.totalShipments || 0,
      totalValue: stats[0]?.totalValue || 0,
      totalShippingCost: stats[0]?.totalShippingCost || 0,
      pendingShipments: stats[0]?.pendingShipments || 0,
      deliveredShipments: stats[0]?.deliveredShipments || 0,
      inTransitShipments: stats[0]?.inTransitShipments || 0,
      shipperBreakdown: shipperStats,
    };

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    return next(
      new ApiEror(`فشل في جلب إحصائيات الشحنات: ${error.message}`, 500)
    );
  }
});
