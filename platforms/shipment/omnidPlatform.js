const axios = require("axios");
const { URLSearchParams } = require("url");

class OmniDeliveryAPI {
  constructor(clientId, clientSecret, isProduction = false) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.isProduction = isProduction;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseURL = isProduction
      ? "https://api.omnic.solutions"
      : "http://dev.ecomgate.omnic.solutions/api/1.0.0/type-1/";
  }

  // === المصادقة ===
  async authenticate() {
    const authUrl = this.isProduction
      ? "https://id.omnic.solutions/oauth/token"
      : "https://id.dev.omnic.solutions/oauth/token";

    const basicAuth = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString("base64");

    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");

    try {
      const response = await axios.post(authUrl, body.toString(), {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      this.accessToken = response.data.data.access_token;
      this.tokenExpiry = Date.now() + response.data.data.expires_in * 1000;
      this.headers = {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      };
    } catch (error) {
      throw new Error(
        `Authentication failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  async ensureAuth() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  // === الطلبات ===
  async createOrder(payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order`;
    const response = await axios.post(url, payload, { headers: this.headers });
    return response.data;
  }

  async updateOrder(orderUid, payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/${orderUid}`;
    const response = await axios.put(url, payload, { headers: this.headers });
    return response.data;
  }

  async cancelOrder(orderUid) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/${orderUid}`;
    const response = await axios.delete(url, { headers: this.headers });
    return response.data;
  }

  async getOrderInfo(orderUid) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/${orderUid}`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async listOrders(params = {}) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order?` + new URLSearchParams(params);
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  // === الويبهوكس ===
  async getWebhooks() {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/webhooks`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async createWebhook(payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/webhooks`;
    const response = await axios.post(url, payload, { headers: this.headers });
    return response.data;
  }

  async updateWebhook(webhookUid, payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/webhooks/${webhookUid}`;
    const response = await axios.patch(url, payload, { headers: this.headers });
    return response.data;
  }

  async deleteWebhook(webhookUid) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/webhooks/${webhookUid}`;
    const response = await axios.delete(url, { headers: this.headers });
    return response.data;
  }

  // === نقاط الشركة ===
  async listCompanyPoints(params = {}) {
    await this.ensureAuth();
    const url =
      `${this.baseURL}/delivery/warehouse?` + new URLSearchParams(params);
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async createCompanyPoint(payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/warehouse`;
    const response = await axios.post(url, payload, { headers: this.headers });
    return response.data;
  }

  async updateCompanyPoint(pointUid, payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/warehouse/${pointUid}`;
    const response = await axios.put(url, payload, { headers: this.headers });
    return response.data;
  }

  // === الطباعة ===
  async printLabels(orders, size) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/print/label`;
    const response = await axios.post(
      url,
      { orders, size },
      { headers: this.headers }
    );
    return response.data;
  }

  // === الشحن والتتبع ===
  async trackShipment(callUid) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/shipment/${callUid}`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async createShipment(payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/shipment`;
    const response = await axios.post(url, payload, { headers: this.headers });
    return response.data;
  }

  async cancelShipment(callUid) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/shipment/${callUid}`;
    const response = await axios.delete(url, { headers: this.headers });
    return response.data;
  }

  // === الحسابات ===
  async calculateDeliveryTariff(payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/calculator/delivery`;
    const response = await axios.post(url, payload, { headers: this.headers });
    return response.data;
  }

  // === استيراد/تصدير السجلات ===
  async importOrders(fileContent, importFlag = true, lang = "en") {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/import`;
    const response = await axios.post(
      url,
      { file_content: fileContent, import: importFlag, lang },
      { headers: this.headers }
    );
    return response.data;
  }

  async exportOrders(params = {}) {
    await this.ensureAuth();
    const url =
      `${this.baseURL}/delivery/order/export?` + new URLSearchParams(params);
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async getImportTemplate(lang, format) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/import/template?lang=${lang}&format=${format}`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  // === حالة الطلب ===
  async listOrderStatuses() {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/statuses`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async getOrderStatusLog(orderUid) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/${orderUid}/status_log`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }
}

module.exports = new OmniDeliveryAPI();
