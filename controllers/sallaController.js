// const SallaStore = require("../models/ecomercModel/sallaStoreModel");
const schedule = require("node-schedule");
const crypto = require("crypto");
const SallaPlatform = require("../platforms/sallaPlatform");
const Store = require("../models/Store");
const Order = require("../models/Order");

const dotenv = require("dotenv");
dotenv.config();

// Get authorization URL for Salla OAuth
exports.getAuthUrl = async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString("hex");

    // req.session.sallaState = state;

    const authUrl = SallaPlatform.getAuthUrl(
      process.env.SALLA_CLIENT_ID,
      process.env.SALLA_REDIRECT_URI,
      state
    );

    res.json({
      success: true,
      authUrl,
      state,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate auth URL",
      error: error.message,
    });
  }
};

// Handle OAuth callback and connect store
exports.handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    // if (!state || state.length < 8) {
    //   return res.status(400).json({ error: "Invalid state parameter" });
    // }

    // تحقق من تطابقها مع القيمة الأصلية (مثال باستخدام الجلسة)
    // if (state !== req.session.sallaState) {
    //   return res.status(403).json({ error: "State mismatch" });
    // }

    const salla = new SallaPlatform(
      process.env.SALLA_CLIENT_ID,
      process.env.SALLA_CLIENT_SECRET,
      process.env.SALLA_REDIRECT_URI
    );

    // Get access token
    const tokens = await salla.getAccessToken(code);

    console.log("Tokens received:", tokens);
    if (!tokens.access_token) {
      return res.status(400).json({ error: "No access token received" });
    }
    // Get store info
    const storeInfo = await salla.getStoreInfo(tokens.access_token);

    // Create or update store record
    const store = await Store.findOneAndUpdate(
      { storeId: storeInfo.id },
      {
        name: storeInfo.name,
        platform: "salla",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        storeInfo,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: "Salla store connected successfully",
      store,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to connect Salla store",
      error: error.message,
    });
  }
};

// Get store orders
exports.getStoreOrders = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findOne({ storeId: storeId });

    if (!store || store.platform !== "salla") {
      return res.status(404).json({
        success: false,
        message: "Salla store not found",
      });
    }

    // Check if token needs refresh
    if (store.tokenExpiresAt < new Date()) {
      const salla = new SallaPlatform(
        process.env.SALLA_CLIENT_ID,
        process.env.SALLA_CLIENT_SECRET,
        process.env.SALLA_REDIRECT_URI
      );

      const tokens = await salla.refreshAccessToken(store.refreshToken);

      // Update store tokens
      store.accessToken = tokens.access_token;
      store.refreshToken = tokens.refresh_token;
      store.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      await store.save();
    }

    const salla = new SallaPlatform(
      process.env.SALLA_CLIENT_ID,
      process.env.SALLA_CLIENT_SECRET,
      process.env.SALLA_REDIRECT_URI
    );

    const response = await salla.getOrders(store.accessToken, req.query);

    // Store orders in the database
    if (!response || !response.data || !Array.isArray(response.data)) {
      console.error("Invalid response structure:", response);
      throw new Error("Invalid orders response structure");
    }

    for (const order of response.data) {
      try {
        // Check if order already exists
        const existingOrder = await Order.findOne({
          id: order.id,
          storeId: store._id,
        });

        if (!existingOrder) {
          // Prepare order data for database
          const orderData = {
            id: order.id,
            reference_id: order.reference_id,
            total: {
              amount: order.total?.amount || 0,
              currency: order.total?.currency || "SAR",
            },
            date: {
              date: order.date?.date || new Date().toISOString(),
              timezone_type: order.date?.timezone_type || 3,
              timezone: order.date?.timezone || "Asia/Riyadh",
            },
            status: {
              id: order.status?.id || "",
              name: order.status?.name || "",
              slug: order.status?.slug || "",
              customized: {
                id: order.status?.customized?.id || "",
                name: order.status?.customized?.name || "",
              },
            },
            payment_method: order.payment_method || "",
            is_pending_payment: order.is_pending_payment || false,
            pending_payment_ends_at: order.pending_payment_ends_at || 0,
            features: {
              shippable: order.features?.shippable || false,
              digitalable: order.features?.digitalable || false,
              pickable: order.features?.pickable || false,
              has_suspicious_alert:
                order.features?.has_suspicious_alert || false,
              bullet_delivery: order.features?.bullet_delivery || [],
            },
            payment_actions: {
              refund_action: {
                has_refund_amount:
                  order.payment_actions?.refund_action?.has_refund_amount ||
                  false,
                payment_method_label:
                  order.payment_actions?.refund_action?.payment_method_label ||
                  "",
                can_print_refund_invoice:
                  order.payment_actions?.refund_action
                    ?.can_print_refund_invoice || false,
                paid_amount: {
                  amount:
                    order.payment_actions?.refund_action?.paid_amount?.amount ||
                    0,
                  currency:
                    order.payment_actions?.refund_action?.paid_amount
                      ?.currency || "SAR",
                },
                refund_amount: {
                  amount:
                    order.payment_actions?.refund_action?.refund_amount
                      ?.amount || 0,
                  currency:
                    order.payment_actions?.refund_action?.refund_amount
                      ?.currency || "SAR",
                },
                loyalty_point_programs:
                  order.payment_actions?.refund_action
                    ?.loyalty_point_programs || [],
                can_send_sms:
                  order.payment_actions?.refund_action?.can_send_sms || false,
                can_send_sms_msg:
                  order.payment_actions?.refund_action?.can_send_sms_msg || "",
              },
              remaining_action: {
                has_remaining_amount:
                  order.payment_actions?.remaining_action
                    ?.has_remaining_amount || false,
                payment_method_label:
                  order.payment_actions?.remaining_action
                    ?.payment_method_label || "",
                paid_amount: {
                  amount:
                    order.payment_actions?.remaining_action?.paid_amount
                      ?.amount || 0,
                  currency:
                    order.payment_actions?.remaining_action?.paid_amount
                      ?.currency || "SAR",
                },
                checkout_url:
                  order.payment_actions?.remaining_action?.checkout_url || "",
                remaining_amount: {
                  amount:
                    order.payment_actions?.remaining_action?.remaining_amount
                      ?.amount || 0,
                  currency:
                    order.payment_actions?.remaining_action?.remaining_amount
                      ?.currency || "SAR",
                },
              },
            },
            items:
              order.items?.map((item) => ({
                name: item.name || "",
                quantity: item.quantity || 0,
                thumbnail: item.thumbnail || "",
              })) || [],
            customer: {
              id: order.customer?.id || "",
              full_name: order.customer?.full_name || "",
              first_name: order.customer?.first_name || "",
              last_name: order.customer?.last_name || "",
              mobile: order.customer?.mobile || "",
              mobile_code: order.customer?.mobile_code || "",
              email: order.customer?.email || "",
              urls: {
                customer: order.customer?.urls?.customer || "",
                admin: order.customer?.urls?.admin || "",
              },
              country: order.customer?.country || "",
              country_code: order.customer?.country_code || "",
              currency: order.customer?.currency || "SAR",
              location: order.customer?.location || "",
              created_at: order.customer?.created_at || {
                date: new Date().toISOString(),
                timezone_type: 3,
                timezone: "Asia/Riyadh",
              },
              updated_at: order.customer?.updated_at || {
                date: new Date().toISOString(),
                timezone_type: 3,
                timezone: "Asia/Riyadh",
              },
            },
            storeId: store._id,
            platform: "salla",
          };

          // Create new order
          await Order.create(orderData);
          console.log(`Created order ${order.id} for store ${store.name}`);
        }
      } catch (orderError) {
        console.error(
          `Error processing order ${order.id}:`,
          orderError.message
        );
      }
    }

    res.json({
      success: true,
      orders: {
        status: 200,
        success: true,
        data: response.data,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch store orders",
      error: error.message,
    });
  }
};

// Update order status in Salla
exports.updateOrderStatus = async (req, res) => {
  try {
    const { storeId, orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "payment_pending",
      "under_review",
      "in_progress",
      "completed",
      "delivering",
      "delivered",
      "shipped",
      "canceled",
      "restored",
      "restoring"
    ];
    

    if (!status || !status.slug) {
      return res
        .status(400)
        .json({ success: false, error: "Status with slug is required" });
    }

    if (!allowedStatuses.includes(status.slug)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid status value" });
    }

    const store = await Store.findOne({ storeId });

    if (!store || store.platform !== "salla") {
      return res.status(404).json({
        success: false,
        message: "Salla store not found",
      });
    }

    const salla = new SallaPlatform(
      process.env.SALLA_CLIENT_ID,
      process.env.SALLA_CLIENT_SECRET,
      process.env.SALLA_REDIRECT_URI
    );

    if (store.tokenExpiresAt < new Date()) {
      try {
        const tokens = await salla.refreshAccessToken(store.refreshToken);
        store.accessToken = tokens.access_token;
        store.refreshToken = tokens.refresh_token;
        store.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        await store.save();
      } catch (refreshErr) {
        return res.status(401).json({
          success: false,
          message: "Failed to refresh access token",
          error: refreshErr.message,
        });
      }
    }

    try {
      const updatedOrder = await salla.updateOrderStatus(
        store.accessToken,
        orderId,
        status
      );

      // update order in db
      await Order.findOneAndUpdate(
        { id: orderId },
        { status: status.slug }, // أو كامل كائن status إذا تحب
        { new: true }
      );

      return res.json({
        success: true,
        message: "Order status updated successfully",
        order: updatedOrder,
      });
    } catch (updateErr) {
      console.error("Update order error:", updateErr);
      return res.status(500).json({
        success: false,
        message: "Failed to update order status",
        error: updateErr.message || "Unexpected error",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error",
      error: error.message,
    });
  }
};

const syncSallaOrders = async () => {
  try {
    const sallaStores = await Store.find({ platform: "salla", isActive: true });

    for (const store of sallaStores) {
      try {
        // Refresh token if needed
        if (store.tokenExpiresAt < new Date()) {
          const tokens = await refreshSallaToken(store.refreshToken);
          store.accessToken = tokens.access_token;
          store.refreshToken = tokens.refresh_token;
          store.tokenExpiresAt = new Date(
            Date.now() + tokens.expires_in * 1000
          );
          await store.save();
        }

        const salla = new SallaPlatform(
          process.env.SALLA_CLIENT_ID,
          process.env.SALLA_CLIENT_SECRET,
          process.env.SALLA_REDIRECT_URI
        );

        // Fetch orders from Salla API
        const response = await salla.getOrders(store.accessToken);

        // Log the response for debugging
        console.log("Salla API Response:", JSON.stringify(response, null, 2));

        // Validate response structure
        if (!response || !response.data || !Array.isArray(response.data)) {
          console.error("Invalid response structure:", response);
          throw new Error("Invalid orders response structure");
        }

        for (const order of response.data) {
          try {
            // Check if order already exists
            const existingOrder = await Order.findOne({
              id: order.id,
              storeId: store._id,
            });

            if (!existingOrder) {
              // Prepare order data for database
              const orderData = {
                id: order.id,
                reference_id: order.reference_id,
                total: {
                  amount: order.total?.amount || 0,
                  currency: order.total?.currency || "SAR",
                },

                date: {
                  date: order.date?.date || new Date().toISOString(),
                  timezone_type: order.date?.timezone_type || 3,
                  timezone: order.date?.timezone || "Asia/Riyadh",
                },
                status: {
                  id: order.status?.id || "",
                  name: order.status?.name || "",
                  slug: order.status?.slug || "",
                  customized: {
                    id: order.status?.customized?.id || "",
                    name: order.status?.customized?.name || "",
                  },
                },
                payment_method: order.payment_method || "",
                is_pending_payment: order.is_pending_payment || false,
                pending_payment_ends_at: order.pending_payment_ends_at || 0,
                features: {
                  shippable: order.features?.shippable || false,
                  digitalable: order.features?.digitalable || false,
                  pickable: order.features?.pickable || false,
                  has_suspicious_alert:
                    order.features?.has_suspicious_alert || false,
                  bullet_delivery: order.features?.bullet_delivery || [],
                },
                payment_actions: {
                  refund_action: {
                    has_refund_amount:
                      order.payment_actions?.refund_action?.has_refund_amount ||
                      false,
                    payment_method_label:
                      order.payment_actions?.refund_action
                        ?.payment_method_label || "",
                    can_print_refund_invoice:
                      order.payment_actions?.refund_action
                        ?.can_print_refund_invoice || false,
                    paid_amount: {
                      amount:
                        order.payment_actions?.refund_action?.paid_amount
                          ?.amount || 0,
                      currency:
                        order.payment_actions?.refund_action?.paid_amount
                          ?.currency || "SAR",
                    },
                    refund_amount: {
                      amount:
                        order.payment_actions?.refund_action?.refund_amount
                          ?.amount || 0,
                      currency:
                        order.payment_actions?.refund_action?.refund_amount
                          ?.currency || "SAR",
                    },
                    loyalty_point_programs:
                      order.payment_actions?.refund_action
                        ?.loyalty_point_programs || [],
                    can_send_sms:
                      order.payment_actions?.refund_action?.can_send_sms ||
                      false,
                    can_send_sms_msg:
                      order.payment_actions?.refund_action?.can_send_sms_msg ||
                      "",
                  },
                  remaining_action: {
                    has_remaining_amount:
                      order.payment_actions?.remaining_action
                        ?.has_remaining_amount || false,
                    payment_method_label:
                      order.payment_actions?.remaining_action
                        ?.payment_method_label || "",
                    paid_amount: {
                      amount:
                        order.payment_actions?.remaining_action?.paid_amount
                          ?.amount || 0,
                      currency:
                        order.payment_actions?.remaining_action?.paid_amount
                          ?.currency || "SAR",
                    },
                    checkout_url:
                      order.payment_actions?.remaining_action?.checkout_url ||
                      "",
                    remaining_amount: {
                      amount:
                        order.payment_actions?.remaining_action
                          ?.remaining_amount?.amount || 0,
                      currency:
                        order.payment_actions?.remaining_action
                          ?.remaining_amount?.currency || "SAR",
                    },
                  },
                },
                items:
                  order.items?.map((item) => ({
                    name: item.name || "",
                    quantity: item.quantity || 0,
                    thumbnail: item.thumbnail || "",
                  })) || [],
                customer: {
                  id: order.customer?.id || "",
                  full_name: order.customer?.full_name || "",
                  first_name: order.customer?.first_name || "",
                  last_name: order.customer?.last_name || "",
                  mobile: order.customer?.mobile || "",
                  mobile_code: order.customer?.mobile_code || "",
                  email: order.customer?.email || "",
                  urls: {
                    customer: order.customer?.urls?.customer || "",
                    admin: order.customer?.urls?.admin || "",
                  },
                  country: order.customer?.country || "",
                  country_code: order.customer?.country_code || "",
                  currency: order.customer?.currency || "SAR",
                  location: order.customer?.location || "",
                  created_at: order.customer?.created_at || {
                    date: new Date().toISOString(),
                    timezone_type: 3,
                    timezone: "Asia/Riyadh",
                  },
                  updated_at: order.customer?.updated_at || {
                    date: new Date().toISOString(),
                    timezone_type: 3,
                    timezone: "Asia/Riyadh",
                  },
                },
                storeId: store._id,
                platform: "salla",
              };

              // Create new order
              await Order.create(orderData);
              console.log(`Created order ${order.id} for store ${store.name}`);
            }
          } catch (orderError) {
            console.error(
              `Error processing order ${order.id}:`,
              orderError.message
            );
          }
        }
      } catch (storeError) {
        console.error(`Error syncing store ${store.name}:`, storeError.message);
      }
    }

    console.log("✅ Successfully synced Salla orders");
  } catch (error) {
    console.error("❌ Failed to sync Salla orders:", error.message);
  }
};


exports.handleOrderCreated = async (req, res) => {
  try {
    const event = req.body;

    // تحقق من نوع الحدث
    if (event.event !== "order.created") {
      return res.status(200).json({ message: "تم تجاهل الحدث" });
    }

    const orderId = event.data?.id;
    let orderData = event.data;

    // جلب بيانات المتجر من قاعدة البيانات (بناءً على store_id من الحدث)
    const storeId = event.store_id || event.data?.store?.id;
    const store = await Store.findOne({ platform: "salla", storeId });

    if (!store) {
      return res.status(404).json({ error: "المتجر غير موجود في قاعدة البيانات" });
    }

    const accessToken = store.accessToken;

    // جلب تفاصيل الطلب من API سلة إذا لم تكن موجودة في الحدث
    if (!orderData && orderId) {
      try {
        const response = await axios.get(
          `https://api.salla.dev/admin/v2/orders/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );
        orderData = response.data.data;
      } catch (fetchErr) {
        console.error("فشل في جلب بيانات الطلب من سلة:", fetchErr);
        return res.status(500).json({ error: "تعذر جلب بيانات الطلب" });
      }
    }

    // تحقق من وجود الطلب مسبقًا
    const exists = await Order.findOne({ platform: "salla", platformOrderId: orderData.id });
    if (exists) {
      return res.status(200).json({ message: "الطلب موجود مسبقًا" });
    }

    // حفظ الطلب في قاعدة البيانات
    if (orderData) {
      await Order.create({
        platform: "salla",
        platformOrderId: orderData.id,
        status: orderData.status,
        total: orderData.total,
        currency: orderData.currency,
        items: orderData.items?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        customer: {
          name: orderData.customer?.name,
          email: orderData.customer?.email
        },
        shippingAddress: orderData.shipping_address || {},
        raw: orderData // لتخزين البيانات الخام إن أردت الرجوع لها لاحقًا
      });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("خطأ في معالجة Webhook سلة:", error);
    return res.status(500).json({ error: "فشل في معالجة Webhook الطلب" });
  }
};


// Run every 5 minutes
// schedule.scheduleJob("* * * * *", () => {
//   console.log("🕓 جاري مزامنة الطلبات كل دقيقة...");
//   syncSallaOrders();
// });

// Sync orders from Salla // i update  to fetch it automatically

// exports.syncOrders = async (req, res) => {
//   try {
//     const { storeId } = req.params;
//     const store = await Store.findById(storeId);

//     if (!store || store.platform !== "salla") {
//       return res.status(404).json({
//         success: false,
//         message: "Salla store not found",
//       });
//     }

//     const salla = new SallaPlatform(
//       process.env.SALLA_CLIENT_ID,
//       process.env.SALLA_CLIENT_SECRET,
//       process.env.SALLA_REDIRECT_URI
//     );

//     const orders = await salla.getOrders(store.accessToken);

//     // Sync orders to our database
//     const syncedOrders = await Promise.all(
//       orders.map(async (order) => {
//         const existingOrder = await Order.findOne({
//           orderId: order.id.toString(),
//           storeId: store._id,
//         });

//         if (!existingOrder) {
//           return Order.create({
//             orderId: order.id.toString(),
//             storeId: store._id,
//             platform: "salla",
//             status: order.status,
//             customer: {
//               name: order.customer.name,
//               email: order.customer.email,
//               phone: order.customer.phone,
//               address: {
//                 street: order.customer.address.street,
//                 city: order.customer.address.city,
//                 country: order.customer.address.country,
//               },
//             },
//             items: order.items.map((item) => ({
//               name: item.name,
//               quantity: item.quantity,
//               price: item.price,
//             })),
//             totalAmount: order.total,
//           });
//         }
//         return existingOrder;
//       })
//     );

//     res.json({
//       success: true,
//       message: "Orders synced successfully",
//       orders: syncedOrders,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to sync orders",
//       error: error.message,
//     });
//   }
// };

// إضافة متجر سلة جديد
// exports.addSallaStore = async (req, res) => {
//   try {
//     const { customerId, storeName, client_id, client_secret } = req.body;

//     const store = new SallaStore({
//       customerId,
//       storeName,
//       client_id,
//       client_secret,
//     });

//     await store.save();
//     res.status(201).json({ message: "Salla store added successfully.", store });
//   } catch (error) {
//     console.error("Error adding Salla store:", error.message);
//     res.status(500).json({ error: "Failed to add Salla store." });
//   }
// };

// // توجيه الزبون لربط المتجر
// exports.connectSallaStore = async (req, res) => {
//   try {
//     const { storeId } = req.params;
//     const store = await SallaStore.findById(storeId);

//     if (!store) {
//       return res.status(404).json({ error: "Salla store not found." });
//     }

//     const redirectUri = process.env.SALLA_REDIRECT_URI;
//     const authUrl = SallaPlatform.getAuthUrl(
//       store.client_id,
//       redirectUri,
//       storeId
//     );

//     // تسجيل الرابط للتحقق منه
//     console.log("Authorization URL:", authUrl);

//     res.redirect(authUrl);
//   } catch (error) {
//     console.error("Error preparing Salla auth URL:", error.message);
//     res.status(500).json({ error: "Failed to prepare Salla auth URL." });
//   }
// };

// // التعامل مع الرد بعد الموافقة
// exports.handleSallaCallback = async (req, res) => {
//   try {
//     const { code, state } = req.query;

//     if (!code || !state) {
//       return res.status(400).json({ error: "Missing code or state." });
//     }

//     const store = await SallaStore.findById(state);

//     if (!store) {
//       return res.status(404).json({ error: "Salla store not found." });
//     }
//     console.log(store.toJSON(), "error");
//     const redirectUri = process.env.SALLA_REDIRECT_URI; // الحصول على redirect_uri من .env

//     if (!redirectUri) {
//       return res
//         .status(500)
//         .json({ error: "Redirect URI is not configured in .env file." });
//     }

//     // تسجيل المعاملات المرسلة للتحقق منها
//     console.log("Token Request Parameters:", {
//       client_id: store.client_id,
//       client_secret: store.client_secret,
//       code,
//       redirect_uri: redirectUri,
//     });

//     const tokenData = await SallaPlatform.getAccessToken(
//       code,
//       store.client_id,
//       store.client_secret,
//       redirectUri
//     );

//     // تحديث بيانات المتجر
//     store.access_token = tokenData.access_token;
//     store.refresh_token = tokenData.refresh_token;
//     await store.save();

//     res.send("Salla store connected successfully!");
//   } catch (error) {
//     console.error("Error handling Salla callback:", error.message);

//     // إرجاع تفاصيل الخطأ للمساعدة في الت-debug
//     res.status(500).json({
//       error: "Failed to connect Salla store.",
//       details: error.message,
//     });
//   }
// };
// // تجديد access_token
// exports.refreshSallaToken = async (req, res) => {
//   try {
//     const { storeId } = req.params;
//     const store = await SallaStore.findById(storeId);

//     if (!store || !store.refresh_token) {
//       return res.status(404).json({
//         error: "Salla store not found or no refresh token available.",
//       });
//     }

//     const refreshedToken = await SallaPlatform.refreshAccessToken(
//       store.refresh_token,
//       store.client_id,
//       store.client_secret
//     );

//     // تحديث بيانات المتجر
//     store.access_token = refreshedToken.access_token;
//     store.refresh_token = refreshedToken.refresh_token || null;
//     await store.save();

//     res.json({
//       message: "Salla token refreshed successfully.",
//       token: refreshedToken,
//     });
//   } catch (error) {
//     console.error("Error refreshing Salla token:", error.message);
//     res.status(500).json({ error: "Failed to refresh Salla token." });
//   }
// };
// /////////////////////////////////////////////////////////////////\

// // جلب الطلبات من متجر سلة
// exports.fetchSallaOrders = async (req, res) => {
//   try {
//     const { storeId } = req.params;
//     const store = await SallaStore.findById(storeId);

//     if (!store || !store.access_token) {
//       return res
//         .status(404)
//         .json({ error: "Salla store not found or no access token available." });
//     }

//     // ضمان صلاحية access_token
//     const validAccessToken = await ensureValidToken(store);

//     const ordersUrl = "https://api.salla.dev/admin/v2/orders";

//     const response = await axios.get(ordersUrl, {
//       headers: {
//         Authorization: `Bearer ${validAccessToken}`,
//       },
//     });

//     let ordersData = response.data;

//     // التأكد من وجود حقل data في الرد
//     if (!Array.isArray(ordersData.data)) {
//       //   console.error("Unexpected response format:", ordersData);
//       throw new Error(
//         "The response from Salla API does not contain a valid orders array."
//       );
//     }

//     ordersData = ordersData.data; // استخدام الحقل data فقط

//     // تخزين الطلبات في قاعدة البيانات
//     await Promise.all(
//       ordersData.map(async (order) => {
//         // استخراج القيم المطلوبة
//         const customer = order.customer;
//         // const paymentMethod = order.data.payment_method;
//         // const products = order.items.map((item) => ({
//         //   productName: item.name,
//         //   quantity: item.quantity,
//         // //   weight: item.weight || 0, // إذا كان الوزن غير متوفر، نستخدم 0
//         // }));

//         const existingOrder = await Order.findOne({
//           orderId: order.id,
//           storeId: store.id,
//         });

//         if (!existingOrder) {
//           const newOrder = new Order({
//             platform: "salla",
//             orderId: order.id,
//             storeId: store.id,
//             orderDate: new Date(order.created_at),
//             customer: {
//               name: customer.name,
//               phone: customer.phone,
//               email: customer.email,
//             },
//             // paymentMethod: paymentMethod,
//             // products: products,
//             // additionalInfo: {
//             //   notes: "تم جلب الطلب من سلة",
//             // },
//           });

//           await newOrder.save();
//         }
//       })
//     );

//     res.json({
//       message: "Orders fetched and stored successfully.",
//       orders: ordersData,
//     });
//   } catch (error) {
//     console.error("Error fetching Salla orders:", error.message);

//     // إرجاع رسالة خطأ واضحة
//     if (
//       error.message.includes(
//         "response from Salla API does not contain a valid orders array"
//       )
//     ) {
//       return res.status(500).json({
//         error: "Failed to fetch Salla orders.",
//         details: "The response format is unexpected.",
//       });
//     }

//     res
//       .status(500)
//       .json({ error: "Failed to fetch Salla orders.", details: error.message });
//   }
// };

// // عرض الطلبات المخزنة
// exports.getStoredOrders = async (req, res) => {
//   try {
//     const { storeId } = req.params;
//     const orders = await Order.find({ storeId, platform: "salla" });

//     res.json({ message: "Stored orders retrieved successfully.", orders });
//   } catch (error) {
//     console.error("Error retrieving stored orders:", error.message);
//     res.status(500).json({ error: "Failed to retrieve stored orders." });
//   }
// };

// // وظيفة تجديد الاعتمادات
// async function ensureValidToken(store) {
//   if (!store.access_token || !store.refresh_token) {
//     throw new Error("No valid tokens available.");
//   }

//   try {
//     // اختبار access_token الحالي
//     const testUrl = "https://api.salla.dev/admin/v2/orders";
//     const testResponse = await axios.get(testUrl, {
//       headers: {
//         Authorization: `Bearer ${store.access_token}`,
//       },
//     });

//     if (testResponse.status === 200) {
//       return store.access_token; // الاعتماد صالح
//     }
//   } catch (error) {
//     if (error.response && error.response.status === 401) {
//       // الاعتماد منتهٍ، قم بتجديده
//       const refreshedToken = await SallaPlatform.refreshAccessToken(
//         store.refresh_token,
//         store.client_id,
//         store.client_secret
//       );

//       // تحديث بيانات المتجر
//       store.access_token = refreshedToken.access_token;
//       store.refresh_token = refreshedToken.refresh_token || null;
//       await store.save();

//       return refreshedToken.access_token;
//     } else {
//       throw error;
//     }
//   }
// }
// // تحديث حالة الطلب في سلة
// exports.updateOrderStatus = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { status } = req.body;

//     if (!status) {
//       return res.status(400).json({ error: "Status is required." });
//     }

//     // البحث عن الطلب في قاعدة البيانات
//     const order = await Order.findOne({ orderId });

//     if (!order) {
//       return res.status(404).json({ error: "Order not found." });
//     }

//     // البحث عن المتجر المرتبط بالطلب
//     const store = await SallaStore.findById(order.storeId);

//     if (!store || !store.access_token) {
//       return res
//         .status(404)
//         .json({ error: "Store not found or no access token available." });
//     }

//     // ضمان صلاحية access_token
//     const validAccessToken = await ensureValidToken(store);

//     // تحضير البيانات لتحديث حالة الطلب في سلة
//     const updateData = {
//       status: status, // الحالة الجديدة
//     };

//     // تحديث حالة الطلب في سلة باستخدام API
//     const updateUrl = `https://api.salla.dev/admin/v2/orders/${orderId}`;
//     const updateResponse = await axios.put(updateUrl, updateData, {
//       headers: {
//         Authorization: `Bearer ${validAccessToken}`,
//         "Content-Type": "application/json",
//       },
//     });

//     // تحديث حالة الطلب في قاعدة البيانات
//     order.status = status;
//     await order.save();

//     res.json({
//       message: "Order status updated successfully in Salla and local database.",
//       order,
//     });
//   } catch (error) {
//     console.error("Error updating order status:", error.message);
//     res.status(500).json({ error: "Failed to update order status." });
//   }
// };
