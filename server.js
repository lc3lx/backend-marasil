const path = require("path");

const session = require("express-session");
const MongoStore = require("connect-mongo");

const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const globalError = require("./middlewares/errormiddleware");

const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRutes");
const customerRoutes = require("./routes/customerRoutes");
const bankInfoRoutes = require("./routes/bankInfoRoutes");
const prsonealInfoRoutes = require("./routes/prsonealInfoRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const walletRoutes = require("./routes/walletRoutes");
const transactionsRoutes = require("./routes/transactitonsRoutes");
const sallaRoutes = require("./routes/sallaRoutes");
const shopifyRoutes = require("./routes/shopifyRoutes");
const zidRoutes = require("./routes/zidRoutes");
const wooCommerceRoutes = require("./routes/woocommerceRoutes");
const mnasatiRoutes = require("./routes/mnasatiRoutes");
const clientAddressRoutes = require("./routes/clientAddressRoutes");
const orderManuallyRoutes = require("./routes/orderManuallyRoutes");
const packageRoutes = require("./routes/packageRoutes");
const shipmentRoutes = require("./routes/shipmentRoute");
const companyShipmentRoutes = require("./routes/shippingCompanyRoute");

// sysytem routes
const employeeRoutes = require("./system/routes/employeeRoutes");
const salaryModifactionRoutes = require("./system/routes/salaryModificationRoutes");
const salaryRoutes = require("./system/routes/salaryRoutes");

// schedule salary processing
const { scheduleSalaryProcessing } = require("./utils/scheduler");
scheduleSalaryProcessing();

//  run function schedule
require("./controllers/sallaController");
require("./controllers/shopifyController");
require("./controllers/zidController");
require("./controllers/wooCommerceController");
require("./controllers/mnasatiController");

const { webhookCheckout } = require("./controllers/walletController");
const app = express();

const PORT = process.env.PORT || 4000;

// توصيل MongoDB
mongoose
  .connect(process.env.DATABASE_URL)
  .then((conn) => {
    console.log(`Database Connected: ${conn.connection.host}`);
  })
  .catch((err) => {
    console.log(`Database Error: ${err.message}`);
    process.exit(1);
  });

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "uploads"))); // is used in an Express.js application to serve static files (like images, CSS, JavaScrip)

// تحميل الروابط
app.use("/api/order", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/bankinfo", bankInfoRoutes);
app.use("/api/personinfo", prsonealInfoRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/tranactions", transactionsRoutes);
app.use("/api/salla", sallaRoutes);
app.use("/api/shopify", shopifyRoutes);
app.use("/api/zid", zidRoutes);
app.use("/api/woocommerce", wooCommerceRoutes);
app.use("/api/mnasati", mnasatiRoutes);
app.use("/api/clientaddress", clientAddressRoutes);
app.use("/api/orderManually", orderManuallyRoutes);
app.use("/api/package", packageRoutes);
app.use("/api/shipment", shipmentRoutes);
app.use("/api/shipmentcompany", companyShipmentRoutes);

//system mount routes
app.use("/api/employees", employeeRoutes);
app.use("/api/salarymodifaction", salaryModifactionRoutes);
app.use("/api/salaries", salaryRoutes);

app.post("/webhook/moyasar", webhookCheckout);

app.use(globalError);

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
