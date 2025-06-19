const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
require("dotenv").config();

// Middlewares
const globalError = require("./middlewares/errormiddleware");

// Models
//const Notification = require("./models/notificationModel");

// Routes
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/adminRoutes");
const orderRoutes = require("./routes/orderRoutes");
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

// System routes
const employeeRoutes = require("./system/routes/employeeRoutes");
const salaryModificationRoutes = require("./system/routes/salaryModificationRoutes");
const salaryRoutes = require("./system/routes/salaryRoutes");

// Utilities
const { scheduleSalaryProcessing } = require("./utils/scheduler");
scheduleSalaryProcessing();

// Controllers (to initialize jobs)
require("./controllers/sallaController");
require("./controllers/shopifyController");
require("./controllers/zidController");
require("./controllers/wooCommerceController");
require("./controllers/mnasatiController");

const { webhookCheckout } = require("./controllers/walletController");

// Initialize app and server
const app = express();
const server = http.createServer(app);

// Socket.IO setup
const socketIo = require("socket.io");
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL
      : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"]
  }
});

// Store active user connections
const activeUsers = new Map();

// MongoDB connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(conn => console.log(`Database Connected: ${conn.connection.host}`))
  .catch(err => {
    console.error(`Database Error: ${err.message}`);
    process.exit(1);
  });

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" }
  })
);

const allowedOrigins = [
  process.env.FRONTEND_URL, // e.g., 'https://marasil.netlify.app'
  "http://localhost:3000",
  "http://localhost:3001"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false); // Just reject, don't throw error
      }
    },
    methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"],
    credentials: true
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "uploads")));
app.use(express.static("public"));

// Socket.IO connection handling (merge all listeners)
io.on("connection", socket => {
  console.log("New client connected", socket.id);

  // Authentication mapping
  socket.on("authenticate", userId => {
    activeUsers.set(userId, socket.id);
    socket.join(`user-${userId}`);
    console.log(`User ${userId} authenticated on socket ${socket.id}`);
  });

  // Admin broadcast
  socket.on("adminBroadcast", async data => {
    try {
      await Notification.create(data);
      io.emit("notification", data);
    } catch (err) {
      console.error("Failed to save notification:", err);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    for (const [userId, sockId] of activeUsers.entries()) {
      if (sockId === socket.id) {
        activeUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Expose io and activeUsers to routes
app.set("io", io);
app.set("activeUsers", activeUsers);

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/salla", sallaRoutes);
app.use("/api/shopify", shopifyRoutes);
app.use("/api/zid", zidRoutes);
app.use("/api/woocommerce", wooCommerceRoutes);
app.use("/api/mnasati", mnasatiRoutes);
app.use("/api/clientaddress", clientAddressRoutes);
app.use("/api/orderManually", orderManuallyRoutes);
app.use("/api/package", packageRoutes);
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/shipment", shipmentRoutes);
app.use("/api/shipmentcompany", companyShipmentRoutes);

// System routes
app.use("/api/employees", employeeRoutes);
app.use("/api/salarymodification", salaryModificationRoutes);
app.use("/api/salaries", salaryRoutes);

// Webhook endpoint
app.post("/webhook/moyasar", webhookCheckout);

// Global error handler
app.use(globalError);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
