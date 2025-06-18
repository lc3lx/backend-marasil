const asyncHandler = require("express-async-handler");
const SmsaOffices = require("../models/smsaOfficesModel");
const ApiError = require("../utils/apiError");
const smsaExpress = require("../platforms/shipment/smsaExpressPlatform");

exports.getOffices = asyncHandler(async (req, res, next) => {
  const compny = req.params.compny?.toLowerCase();
  if (!compny) {
    return next(new ApiError("يرجى اختيار اسم الشركة", 400));
  }

  let offices;
  switch (compny) {
    case "smsa":
      offices = await smsaExpress.getOfficesAddress();
      if (offices.length) {
        const ops = offices.map((o) => ({
          updateOne: {
            filter: { code: o.code },
            update: {
              $set: {
                address: o.address,
                cityName: o.cityName,
                addressAR: o.addressAR,
                coordinates: o.coordinates,
                firstShift: o.firstShift,
                secondShift: o.secondShift,
                weekendShift: o.weekendShift,
                lastSync: new Date(),
              },
            },
            upsert: true,
          },
        }));
        await SmsaOffices.bulkWrite(ops);
      }
      break;
    default:
      return next(
        new ApiError(`الشركة "${req.params.compny}" غير مدعومة`, 404)
      );
  }

  res.status(200).json({
    status: "success",
    results: offices.length,
    data: { offices },
  });
});
