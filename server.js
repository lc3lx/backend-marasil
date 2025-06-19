const path = require("path");

const session = require("express-session");
const MongoStore = require("connect-mongo");

const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const globalError = require("./middlewares/errormiddleware");

// notification routes
const notificationRoutes = require("./routes/notificationRoutes");
const Notification = require("./models/notifactionModel");

// Routes
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/adminRoutes");
const orderRoutes = require("./routes/orderRoutes");
// const bankInfoRoutes = require("./routes/bankInfoRoutes");
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

// send notifaction

const http = require("http");
const socketIo = require("socket.io");
// const Notification = require("./models/notificationModel"); // استيراد نموذج الإشعارات

// 2️⃣ إنشاء تطبيق Express وسيرفر HTTP
const server = http.createServer(app);

// 3️⃣ تمرير السيرفر إلى socket.io
// ⿣ تمرير السيرفر إلى socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? process.env.FRONTEND_URL || "http://localhost:3000" 
      : ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"]
  },
});

// Store active user connections
const activeUsers = new Map();

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected");

  // User authentication and mapping
  socket.on("authenticate", (userId) => {
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} connected with socket ${socket.id}`);

    // Join a room specific to this user
    socket.join(`user-${userId}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    // Remove user from active users
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Make io accessible to our routes
app.set("io", io);
app.set("activeUsers", activeUsers);

// 4️⃣ استضافة ملفات الواجهة الأمامية (index.html مثلاً)
app.use(express.static("public")); // public/index.html مثلاً

// 5️⃣ التعامل مع الاتصالات الجديدة
io.on("connection", (socket) => {
  socket.on("adminBroadcast", async (data) => {
    // حفظ في Mongo
    await Notification.create(data);

    // إرسال لكل المستخدمين
    io.emit("notification", data);
  });
});

// تحميل الروابط

app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/order", orderRoutes);
// app.use("/api/bankinfo", bankInfoRoutes);
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
app.use("/api/notifications", notificationRoutes);
app.use("/api/shipment", shipmentRoutes);
app.use("/api/shipmentcompany", companyShipmentRoutes);
//system mount routes
app.use("/api/employees", employeeRoutes);
app.use("/api/salarymodifaction", salaryModifactionRoutes);
app.use("/api/salaries", salaryRoutes);

// Middleware لتحليل JSON
// app.use(express.json());
// app.use(express.static(path.join(__dirname, "uploads")));

app.post("/webhook/moyasar", webhookCheckout);

app.use(globalError);

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
