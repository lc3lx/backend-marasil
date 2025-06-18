const CustomerShippingContract = require("../models/customerShippingContract");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");

// @desc    إنشاء عقد شحن جديد للعميل
// @route   POST /api/v1/customer-contracts
// @access  Private/Admin
exports.createCustomerContract = asyncHandler(async (req, res) => {
  const contract = await CustomerShippingContract.create(req.body);
  res.status(201).json({
    status: "success",
    data: contract,
  });
});

// @desc    الحصول على جميع عقود العملاء
// @route   GET /api/v1/customer-contracts
// @access  Private/Admin
exports.getCustomerContracts = asyncHandler(async (req, res) => {
  const contracts = await CustomerShippingContract.find().populate("customer", "name email");
  res.status(200).json({
    status: "success",
    results: contracts.length,
    data: contracts,
  });
});

// @desc    الحصول على عقود عميل محدد
// @route   GET /api/v1/customer-contracts/customer/:customerId
// @access  Private/Admin
exports.getCustomerContractsByCustomer = asyncHandler(async (req, res) => {
  const contracts = await CustomerShippingContract.find({
    customer: req.params.customerId,
  }).populate("customer", "name email");

  res.status(200).json({
    status: "success",
    results: contracts.length,
    data: contracts,
  });
});

// @desc    الحصول على عقد محدد
// @route   GET /api/v1/customer-contracts/:id
// @access  Private/Admin
exports.getCustomerContract = asyncHandler(async (req, res, next) => {
  const contract = await CustomerShippingContract.findById(req.params.id).populate(
    "customer",
    "name email"
  );

  if (!contract) {
    return next(new ApiError(`No contract found with id ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: "success",
    data: contract,
  });
});

// @desc    تحديث عقد
// @route   PUT /api/v1/customer-contracts/:id
// @access  Private/Admin
exports.updateCustomerContract = asyncHandler(async (req, res, next) => {
  const contract = await CustomerShippingContract.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate("customer", "name email");

  if (!contract) {
    return next(new ApiError(`No contract found with id ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: "success",
    data: contract,
  });
});

// @desc    تفعيل/تعطيل عقد
// @route   PATCH /api/v1/customer-contracts/:id/toggle-active
// @access  Private/Admin
exports.toggleContractActive = asyncHandler(async (req, res, next) => {
  const contract = await CustomerShippingContract.findById(req.params.id);

  if (!contract) {
    return next(new ApiError(`No contract found with id ${req.params.id}`, 404));
  }

  contract.isActive = !contract.isActive;
  await contract.save();

  res.status(200).json({
    status: "success",
    data: contract,
  });
});

// @desc    حذف عقد
// @route   DELETE /api/v1/customer-contracts/:id
// @access  Private/Admin
exports.deleteCustomerContract = asyncHandler(async (req, res, next) => {
  const contract = await CustomerShippingContract.findByIdAndDelete(req.params.id);

  if (!contract) {
    return next(new ApiError(`No contract found with id ${req.params.id}`, 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
