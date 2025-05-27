const asyncHandler = require("express-async-handler");
const factory = require("./handlersFactory");
const Order = require("../models/orderManuallyModel");

exports.getOrders = asyncHandler(async (req, res, next) => {
  const order = await Order.find({ customer: req.customer._id });
  res.status(200).json({ results: order.length, data: order });
});

exports.getoneOrder = factory.getOne(Order);

exports.setclientAddressToBody = (req, res, next) => {
  //  Nasted route
  if (!req.body.clientAddress) {
    req.body.clientAddress = req.params.clientid;
  }

  next();
};
exports.createOrders = asyncHandler(async (req, res, next) => {
  const Addresse = await Order.create({
    customer: req.customer._id,
    ...req.body,
  });

  res.status(201).json({ status: "success", data: Addresse });
});

exports.updateOrders = factory.updateOne(Order);

exports.deleteOrders = factory.deleteOne(Order);
