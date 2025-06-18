// const ZadStore = require("../models/ecomercModel/zadStoreModel");
const ZadPlatform = require("../platforms/zadPlatform");
const dotenv = require("dotenv");
dotenv.config();

// إضافة متجر Zad جديد
exports.addZadStore = async (req, res) => {
  try {
    const { customerId, storeName, client_id, client_secret } = req.body;

    const store = new ZadStore({
      customerId,
      storeName,
      client_id,
      client_secret,
    });

    await store.save();
    res.status(201).json({ message: "Zad store added successfully.", store });
  } catch (error) {
    console.error("Error adding Zad store:", error.message);
    res.status(500).json({ error: "Failed to add Zad store." });
  }
};

// توجيه الزبون لربط المتجر
exports.connectZadStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await ZadStore.findById(storeId);

    if (!store) {
      return res.status(404).json({ error: "Zad store not found." });
    }

    const redirectUri = process.env.ZAD_REDIRECT_URI;

    // بناء الرابط لطلب الموافقة
    const authUrl = ZadPlatform.getAuthUrl(store.client_id, redirectUri);

    console.log("Authorization URL:", authUrl); // تسجيل الرابط للتحقق منه
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error preparing Zad auth URL:", error.message);
    res.status(500).json({ error: "Failed to prepare Zad auth URL." });
  }
};

// التعامل مع الرد بعد الموافقة
exports.handleZadCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: "Missing code or state." });
    }

    const store = await ZadStore.findById(state);

    if (!store) {
      return res.status(404).json({ error: "Zad store not found." });
    }

    const redirectUri = process.env.ZAD_REDIRECT_URI;

    // الحصول على الاعتمادات
    const tokenData = await ZadPlatform.getAccessToken(
      code,
      store.client_id,
      store.client_secret,
      redirectUri
    );

    // تحديث بيانات المتجر
    store.access_token = tokenData.access_token;
    store.refresh_token = tokenData.refresh_token;
    await store.save();

    res.send("Zad store connected successfully!");
  } catch (error) {
    console.error("Error handling Zad callback:", error.message);
    res
      .status(500)
      .json({ error: "Failed to connect Zad store.", details: error.message });
  }
};

// جلب الطلبات من متجر Zad
exports.fetchZadOrders = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await ZadStore.findById(storeId);

    if (!store || !store.access_token) {
      return res
        .status(404)
        .json({ error: "Zad store not found or no access token available." });
    }

    // ضمان صلاحية access_token
    const validAccessToken = await ensureValidToken(store);

    const ordersUrl = "https://api.zid.sa/v1/orders";

    const response = await axios.get(ordersUrl, {
      headers: {
        Authorization: `Bearer ${validAccessToken}`,
        "X-MANAGER-TOKEN": validAccessToken, // استخدام access_token كـ X-MANAGER-TOKEN
      },
    });

    const ordersData = response.data;

    // تخزين الطلبات في قاعدة البيانات
    await Promise.all(
      ordersData.map(async (order) => {
        const existingOrder = await Order.findOne({
          orderId: order.id,
          storeId: store._id,
        });

        if (!existingOrder) {
          const newOrder = new Order({
            storeId: store._id,
            platform: "zad",
            orderId: order.id,
            status: order.status || "unknown",
            totalAmount: parseFloat(order.total_price) || 0,
            createdAt: new Date(order.created_at || Date.now()),
            data: order, // تخزين البيانات المختلفة
          });

          await newOrder.save();
        }
      })
    );

    res.json({
      message: "Zad orders fetched and stored successfully.",
      orders: ordersData,
    });
  } catch (error) {
    console.error("Error fetching Zad orders:", error.message);

    // إرجاع رسالة خطأ واضحة
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: "No orders found for this store." });
    }

    res
      .status(500)
      .json({ error: "Failed to fetch Zad orders.", details: error.message });
  }
};
async function ensureValidToken(store) {
  if (!store.access_token || !store.refresh_token) {
    throw new Error("No valid tokens available.");
  }

  try {
    // اختبار access_token الحالي
    const testUrl = "https://api.zid.sa/v1/orders";
    const testResponse = await axios.get(testUrl, {
      headers: {
        Authorization: `Bearer ${store.access_token}`,
        "X-MANAGER-TOKEN": store.access_token,
      },
    });

    if (testResponse.status === 200) {
      return store.access_token; // الاعتماد صالحة
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // الاعتماد منتهية، قم بتجديدها
      const refreshedToken = await ZadPlatform.refreshAccessToken(
        store.refresh_token,
        store.client_id,
        store.client_secret,
        process.env.ZAD_REDIRECT_URI
      );

      // تحديث بيانات المتجر
      store.access_token = refreshedToken.access_token;
      store.refresh_token = refreshedToken.refresh_token || null;
      await store.save();

      return refreshedToken.access_token;
    } else {
      throw error;
    }
  }
}
