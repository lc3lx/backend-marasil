const axios = require("axios");
const crypto = require("crypto");
const { Shopify } = require("@shopify/shopify-api");

class ShopifyPlatform {
  constructor(storeName = null, accessToken = null) {
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      throw new Error("Shopify API credentials are not configured");
    }

    this.storeName = storeName || process.env.SHOPIFY_SHOP_NAME;
    this.accessToken = accessToken || process.env.SHOPIFY_ACCESS_TOKEN;
    this.apiVersion = process.env.SHOPIFY_API_VERSION || "2024-01";

    if (this.storeName && this.accessToken) {
      this.client = new Shopify.Clients.Rest(this.storeName, this.accessToken);
    }
  }

  // Generate OAuth URL for store authorization
  getAuthorizationUrl(storeName) {
    if (!process.env.APP_URL) {
      throw new Error("APP_URL environment variable is not configured");
    }

    const scopes = [
      "read_orders",
      "write_orders",
      "read_products",
      "read_customers",
      "read_inventory",
    ].join(",");

    const redirectUri = `${process.env.APP_URL}/api/shopify/auth/callback`;
    const state = crypto.randomBytes(16).toString("hex");

    const authUrl =
      `https://${storeName}.myshopify.com/admin/oauth/authorize?` +
      `client_id=${process.env.SHOPIFY_API_KEY}&` +
      `scope=${scopes}&` +
      `redirect_uri=${redirectUri}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  // Exchange authorization code for access token
  async getAccessToken(storeName, code) {
    try {
      if (!code) {
        throw new Error("Authorization code is required");
      }

      const response = await axios.post(
        `https://${storeName}.myshopify.com/admin/oauth/access_token`,
        {
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code,
        }
      );

      if (!response.data.access_token) {
        throw new Error("Failed to get access token from Shopify");
      }

      return response.data.access_token;
    } catch (error) {
      console.error(
        "Error getting access token:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to get access token: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  }

  // Get store information
  async getStoreInfo() {
    try {
      if (!this.storeName || !this.accessToken) {
        throw new Error("Store name and access token are required");
      }

      const response = await axios.get(
        `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/shop.json`,
        {
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
          },
        }
      );

      if (!response.data.shop) {
        throw new Error("Invalid response format from Shopify");
      }

      return response.data.shop;
    } catch (error) {
      console.error(
        "Error getting store info:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to get store info: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  }

  // Fetch orders from Shopify
  async getOrders(params = {}) {
    try {
      if (!this.storeName || !this.accessToken) {
        throw new Error("Store name and access token are required");
      }

      const response = await axios.get(
        `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/orders.json`,
        {
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
          },
          params,
        }
      );

      if (!response.data.orders) {
        throw new Error("Invalid response format from Shopify");
      }

      return response.data.orders;
    } catch (error) {
      console.error(
        "Error fetching orders:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to fetch orders: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  }

  // Update order status in Shopify
  async updateOrderStatus(orderId, status) {
    try {
      if (!this.storeName || !this.accessToken || !orderId || !status) {
        throw new Error(
          "All parameters are required for updating order status"
        );
      }

      const response = await axios.put(
        `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/orders/${orderId}.json`,
        {
          order: {
            id: orderId,
            status: status,
          },
        },
        {
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
          },
        }
      );

      if (!response.data.order) {
        throw new Error("Invalid response format from Shopify");
      }

      return response.data.order;
    } catch (error) {
      console.error(
        "Error updating order status:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to update order status: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(webhookBody, hmacHeader) {
    if (!hmacHeader) {
      throw new Error("Missing HMAC header");
    }

    if (!webhookBody) {
      throw new Error("Missing webhook body");
    }

    const message =
      typeof webhookBody === "string"
        ? webhookBody
        : JSON.stringify(webhookBody);

    const calculatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(message)
      .digest("base64");

    return calculatedHmac === hmacHeader;
  }
}

module.exports = ShopifyPlatform;
