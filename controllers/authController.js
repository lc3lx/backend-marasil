const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");
const Customer = require("../models/customerModel");
const Wallet = require("../models/walletModel");

// @desc    Signup
// @route   GET /api/v1/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res, next) => {
  const customer = await Customer.create({
    email: req.body.email,
    password: req.body.password,
    firstName: req.body.firstName,

  });
  // const wallet = Wallet.create({
  //   customerId: customer._id,
  //   balance: 0,
  // });
  const token = createToken(customer._id);
  res.status(201).json({ data: customer, token });
});
// @desc    Login
// @route   GET /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  try {
    // البحث عن العميل بناءً على البريد الإلكتروني
    const customer = await Customer.findOne({ email: req.body.email });

    // التحقق مما إذا كان العميل موجودًا
    if (!customer) {
      return next(new ApiError("Incorrect email or password", 401));
    }

    // التحقق مما إذا كانت كلمة المرور المدخلة وكلمة المرور المخزنة صالحتين
    if (!req.body.password || !customer.password) {
      return next(new ApiError("Password is missing or invalid", 401));
    }

    // مقارنة كلمتي المرور
    const isPasswordValid = await bcrypt.compare(
      req.body.password,
      customer.password
    );

    if (!isPasswordValid) {
      return next(new ApiError("Incorrect email or password", 401));
    }

    // إنشاء رمز التوثيق (token)
    const token = createToken(customer._id);
    console.log(token);
    // حذف حقل كلمة المرور من الكائن المرسل في الاستجابة
    delete customer._doc.password;

    // إرسال الاستجابة بنجاح
    res.status(200).json({ data: customer, token });
  } catch (error) {
    // التعامل مع الأخطاء غير المتوقعة
    return next(new ApiError(error.message, 500));
  }
});
// @desc   make sure the user is logged in
exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new ApiError("You are not login ,please login to get access route", 401)
    );
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const currentCustomer = await Customer.findById(decoded.customerId);
  if (!currentCustomer) {
    return next(
      new ApiError(
        "the user that belong to this token does no longer exist ",
        401
      )
    );
  }
  if (currentCustomer.passwordChangedAt) {
    const passchangedTimestamp = parseInt(
      currentCustomer.passwordChangedAt.getTime() / 1000,
      10
    );
    if (passchangedTimestamp > decoded.iat) {
      return next(
        ApiError(
          "useer recently changed his password, plese login again..",
          401
        )
      );
    }
  }
  req.customer = currentCustomer;
  next();
});
// @desc    Authorization (User Permissions)
// ["admin", "manager"]
exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    // 1) access roles
    // 2) access registered user (req.user.role)
    if (!roles.includes(req.customer.role)) {
      return next(
        new ApiError("You are not allowed to access this route", 403)
      );
    }
    next();
  });
