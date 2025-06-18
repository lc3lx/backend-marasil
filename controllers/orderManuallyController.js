const asyncHandler = require("express-async-handler");
const factory = require("./handlersFactory");
const Order = require("../models/Order");

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
    platform: "Marasil",
    number_of_boxes: req.body.number_of_boxes,
    weight: req.body.weight,
    box_dimensions: {
      length: req.body.length,
      width: req.body.width,
      height: req.body.height,
    },
    product_description: req.body.product_description,
    payment_method: req.body.payment_method,
    product_value: req.body.product_value,
    order_number: req.body.order_number,
    clientAddress: req.body.clientAddress,
  });

  res.status(201).json({ status: "success", data: Addresse });
});

exports.updateOrders = factory.updateOne(Order);

exports.deleteOrders = factory.deleteOne(Order);
