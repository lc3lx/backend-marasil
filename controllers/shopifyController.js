const schedule = require("node-schedule");
const ShopifyPlatform = require("../platforms/shopifyPlatform");
const Store = require("../models/Store");
const Order = require("../models/Order");

class ShopifyController {
  // الخطوة 1: توليد رابط الأذونات (Authorization URL)
  async getAuthUrl(req, res) {
    try {
      const { storeName } = req.query;
      if (!storeName) {
        return res.status(400).json({ error: "storeName مطلوب" });
      }

      const platform = new ShopifyPlatform();
      const { authUrl, state } = platform.getAuthorizationUrl(storeName);

      // ممكن تخزن state في الجلسة Session للتأكد من الأمان لاحقًا
      res.json({ authUrl, state });
    } catch (error) {
      console.error("خطأ أثناء إنشاء رابط الأذونات:", error);
      res.status(500).json({ error: "فشل في إنشاء رابط الأذونات" });
    }
  }

  // الخطوة 2: استلام الكود من Shopify وتخزين بيانات المتجر
  async authCallback(req, res) {
    try {
      const { code, shop } = req.query;

      if (!code || !shop) {
        return res.status(400).json({ error: "معلومات ناقصة من Shopify" });
      }

      const storeName = shop.replace(".myshopify.com", "");
      const platform = new ShopifyPlatform();

      const accessToken = await platform.getAccessToken(storeName, code);

      const fullPlatform = new ShopifyPlatform(storeName, accessToken);
      const storeInfo = await fullPlatform.getStoreInfo();

      let store = await Store.findOne({ storeName });
      if (store) {
        // تحديث المتجر الحالي
        store.accessToken = accessToken;
        store.storeInfo = storeInfo;
        store.isActive = true;
        await store.save();
      } else {
        // إنشاء متجر جديد
        store = await Store.create({
          platform: "shopify",
          name: storeInfo.name || storeName,
          storeName,
          accessToken,
          storeInfo,
          isActive: true,
        });
      }

      res.json({
        message: "تم ربط المتجر بنجاح",
        storeId: store._id,
        storeName: store.storeName,
      });
    } catch (error) {
      console.error("خطأ أثناء إتمام الربط:", error);
      res.status(500).json({ error: "فشل في ربط المتجر" });
    }
  }
  // ✅ جلب الطلبات من المتجر
  async getOrders(req, res) {
    try {
      const { storeId } = req.params;
      const store = await Store.findById(storeId);

      if (!store) {
        return res.status(404).json({ error: "المتجر غير موجود" });
      }

      const platform = new ShopifyPlatform(store.storeName, store.accessToken);
      const orders = await platform.getOrders(req.query);

      // حفظ الطلبات في قاعدة البيانات
      for (const order of orders) {
        await Order.findOneAndUpdate(
          { platformOrderId: order.id },
          {
            storeId,
            platform: "shopify",
            platformOrderId: order.id,
            status: order.financial_status || order.fulfillment_status,
            total: order.total_price,
            currency: order.currency,
            items: order.line_items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            customer: {
              name: `${order.customer?.first_name || ""} ${
                order.customer?.last_name || ""
              }`,
              email: order.customer?.email || "",
            },
            shippingAddress: order.shipping_address,
          },
          { upsert: true, new: true }
        );
      }

      res.json(orders);
    } catch (error) {
      console.error("خطأ في جلب الطلبات:", error);
      res.status(500).json({ error: "فشل في جلب الطلبات" });
    }
  }

  // ✅ تحديث حالة الطلب
  async updateOrderStatus(req, res) {
    try {
      const { storeId, orderId } = req.params;
      const { status } = req.body;

      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({ error: "المتجر غير موجود" });
      }

      const platform = new ShopifyPlatform(store.storeName, store.accessToken);
      const updatedOrder = await platform.updateOrderStatus(orderId, status);

      // تحديث الطلب في قاعدة البيانات
      await Order.findOneAndUpdate({ platformOrderId: orderId }, { status });

      res.json(updatedOrder);
    } catch (error) {
      console.error("خطأ في تحديث حالة الطلب:", error);
      res.status(500).json({ error: "فشل في تحديث حالة الطلب" });
    }
  }
}
async function syncShopifyOrders() {
  try {
    const stores = await Store.find({ platform: "shopify", isActive: true });

    for (const store of stores) {
      try {
        const platform = new ShopifyPlatform(
          store.storeName,
          store.accessToken
        );
        const orders = await platform.getOrders({}); // يمكنك تخصيص الفلاتر هنا مثل { status: 'any' }

        for (const order of orders) {
          await Order.findOneAndUpdate(
            { platformOrderId: order.id },
            {
              storeId: store._id,
              platform: "shopify",
              platformOrderId: order.id,
              status: order.financial_status || order.fulfillment_status,
              total: order.total_price,
              currency: order.currency,
              items: order.line_items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              })),
              customer: {
                name: `${order.customer?.first_name || ""} ${
                  order.customer?.last_name || ""
                }`,
                email: order.customer?.email || "",
              },
              shippingAddress: order.shipping_address,
            },
            { upsert: true, new: true }
          );
        }

        console.log(`تمت مزامنة الطلبات لمتجر: ${store.storeName}`);
      } catch (err) {
        console.error(` فشل في مزامنة الطلبات لمتجر ${store.storeName}:`, err);
      }
    }
  } catch (error) {
    console.error(" خطأ عام في مزامنة طلبات Shopify:", error);
  }
}
schedule.scheduleJob("0 * * * *", () => {
  console.log("🕒 جاري مزامنة طلبات Shopify كل ساعة...");
  syncShopifyOrders();
});

module.exports = new ShopifyController();
