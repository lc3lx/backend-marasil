const axios = require("axios");
const config = require("../config/config");

class AramexService {
  constructor() {
    this.apiKey = process.env.ARAMEX_API_KEY || "your-aramex-api-key"; // Replace with your API key
    this.baseURL = "https://ws.aramex.net/ShippingAPI.V2"; // Aramex sandbox or production URL
    this.client = axios.create({
      baseURL: this.baseURL,
    });

    // Aramex ClientInfo (replace with your actual credentials)
    this.clientInfo = {
      UserName: process.env.ARAMEX_USERNAME || "your-username",
      Password: process.env.ARAMEX_PASSWORD || "your-password",
      Version: "v1",
      AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER || "your-account-number",
      AccountPin: process.env.ARAMEX_ACCOUNT_PIN || "your-account-pin",
      AccountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || "your-account-entity",
      AccountCountryCode: process.env.ARAMEX_COUNTRY_CODE || "SA",
    };
  }

  /**
   * Format customer address to Aramex-compatible structure
   * @param {Object} address - Customer address from database
   * @returns {Object} - Formatted address for Aramex
   */
  formatAddress(address) {
    return {
      Line1: address.addressLine1 || "Not Specified",
      Line2: address.addressLine2 || "",
      Line3: address.addressLine3 || "",
      City: address.city || "Not Specified",
      StateOrProvinceCode: address.state || "",
      PostCode: address.postalCode || "",
      CountryCode: address.country || "SA", // ISO 3166-1 Alpha-2 Code
      Name: address.name || "Not Specified",
      Company: address.company || "Not Specified",
      Phone: address.phone || "0000000000",
      Email: address.email || "notspecified@example.com",
      CellPhone: address.cellPhone || address.phone || "0000000000",
    };
  }

  /**
   * Create a new shipment
   * @param {Object} shipmentData - Shipment details
   * @returns {Promise<Object>} - Shipment creation result
   */
  async createShipment(shipmentData) {
    try {
      // 1. Validate input data
      if (!shipmentData.receiverAddress || !shipmentData.senderAddress) {
        throw new Error("Sender or receiver address is missing");
      }

      // 2. Prepare payload
      const payload = {
        ClientInfo: this.clientInfo,
        Transaction: {
          Reference1: shipmentData.orderId || "ORD-UNKNOWN",
          Reference2: "",
          Reference3: "",
          Reference4: "",
          Reference5: "",
        },
        Shipments: [
          {
            Shipper: {
              Reference1: shipmentData.senderReference || "",
              AccountNumber: this.clientInfo.AccountNumber,
              PartyAddress: this.formatAddress(shipmentData.senderAddress),
            },
            Consignee: {
              Reference1: shipmentData.receiverReference || "",
              PartyAddress: this.formatAddress(shipmentData.receiverAddress),
            },
            ShippingDateTime: new Date().toISOString(),
            DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            Reference1: shipmentData.orderId || "ORD-UNKNOWN",
            Reference2: "",
            PaymentType: shipmentData.paymentType || "P", // P: Prepaid, C: Collect
            ProductGroup: shipmentData.productGroup || "EXP", // EXP: Express, DOM: Domestic
            ProductType: shipmentData.productType || "OND", // OND: Overnight Document
            Services: shipmentData.services || "",
            NumberOfPieces: parseInt(shipmentData.boxNum, 10) || 1,
            DescriptionOfGoods: shipmentData.orderDescription || "E-commerce shipment",
            GoodsOriginCountry: shipmentData.senderAddress?.country || "SA",
            Weight: {
              Value: parseFloat(shipmentData.weight) || 1.0,
              Unit: "KG",
            },
            CashOnDeliveryAmount: {
              Value:
                shipmentData.paymentMethod === "COD"
                  ? parseFloat(shipmentData.orderValue) || 0.0
                  : 0.0,
              CurrencyCode: "SAR",
            },
            CustomsValueAmount: {
              Value: parseFloat(shipmentData.orderValue) || 0.0,
              CurrencyCode: "SAR",
            },
            Details: {
              ActualWeight: {
                Value: parseFloat(shipmentData.weight) || 1.0,
                Unit: "KG",
              },
              Items: shipmentData.items?.map((item) => ({
                PackageType: item.packageType || "Box",
                Quantity: item.quantity || 1,
                Weight: {
                  Value: item.weight || 1.0,
                  Unit: "KG",
                },
                Comments: item.description || "",
              })) || [],
            },
          },
        ],
      };

      // 3. Send request
      const response = await this.client.post("/Shipping/ShipmentCreation", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        validateStatus: (status) => status < 500,
      });

      // 4. Handle response
      if (response.status === 401) {
        throw new Error("Unauthorized: Please check API Key or ClientInfo");
      }

      if (response.status === 400) {
        const errorDetails = response.data.Notifications?.map(
          (n) => `${n.Code}: ${n.Message}`
        ).join("\n") || JSON.stringify(response.data);
        throw new Error(`Invalid data:\n${errorDetails}`);
      }

      // 5. Process successful response
      if (response.data?.HasErrors === false && response.data.Shipments?.length > 0) {
        const shipment = response.data.Shipments[0];
        return {
          success: true,
          trackingNumber: shipment.ID,
          label: shipment.ShipmentLabel?.LabelURL || "",
          createdDate: new Date().toISOString(),
        };
      }

      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
    } catch (error) {
      const errorLog = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        },
      };
      console.error("Aramex API Error:", errorLog);
      throw new Error(`Failed to create shipment: ${error.message}`);
    }
  }

  /**
   * Track a shipment
   * @param {String} trackingNumber - Shipment tracking number
   * @returns {Promise<Object>} - Tracking details
   */
  async trackShipment(trackingNumber) {
    try {
      const payload = {
        ClientInfo: this.clientInfo,
        Transaction: {
          Reference1: trackingNumber,
        },
        Shipments: [trackingNumber],
      };

      const response = await this.client.post("/Tracking/TrackShipments", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        validateStatus: (status) => status < 500,
      });

      if (response.data?.HasErrors) {
        throw new Error(
          response.data.Notifications?.map((n) => n.Message).join(", ") ||
            "Tracking failed"
        );
      }

      return {
        success: true,
        tracking: response.data.TrackingResults?.[0]?.TrackingResult || {},
      };
    } catch (error) {
      console.error("Aramex Tracking Error:", error.response?.data || error.message);
      throw new Error(`Failed to track shipment: ${error.message}`);
    }
  }

  /**
   * Cancel a shipment
   * @param {String} trackingNumber - Shipment tracking number
   * @returns {Promise<Object>} - Cancellation result
   */
  async cancelShipment(trackingNumber) {
    try {
      const payload = {
        ClientInfo: this.clientInfo,
        Transaction: {
          Reference1: trackingNumber,
        },
        ShipmentNumber: trackingNumber,
      };

      const response = await this.client.post("/Shipping/CancelShipment", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return {
        success: true,
        message: response.data?.Message || "Shipment canceled successfully",
      };
    } catch (error) {
      console.error("Aramex Cancel Error:", error.response?.data || error.message);
      throw new Error(`Failed to cancel shipment: ${error.message}`);
    }
  }

  /**
   * Create a return shipment
   * @param {Object} returnData - Return shipment details
   * @returns {Promise<Object>} - Return shipment creation result
   */
  async createReturnShipment(returnData) {
    try {
      const payload = {
        ClientInfo: this.clientInfo,
        Transaction: {
          Reference1: returnData.orderId || "RET-UNKNOWN",
        },
        Shipments: [
          {
            Shipper: {
              Reference1: returnData.senderReference || "",
              PartyAddress: this.formatAddress(returnData.pickupAddress),
              AccountNumber: this.clientInfo.AccountNumber,
            },
            Consignee: {
              Reference1: returnData.receiverReference || "",
              PartyAddress: this.formatAddress(returnData.returnToAddress),
            },
            ShippingDateTime: new Date().toISOString(),
            DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            Reference1: returnData.orderId || "RET-UNKNOWN",
            PaymentType: "P",
            ProductGroup: "DOM",
            ProductType: "RPU", // Return Pickup
            NumberOfPieces: parseInt(returnData.boxNum, 10) || 1,
            DescriptionOfGoods: returnData.description || "Return shipment",
            GoodsOriginCountry: returnData.pickupAddress?.country || "SA",
            Weight: {
              Value: parseFloat(returnData.weight) || 1.0,
              Unit: "KG",
            },
          },
        ],
      };

      const response = await this.client.post("/Shipping/ShipmentCreation", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.data?.HasErrors === false && response.data.Shipments?.length > 0) {
        const shipment = response.data.Shipments[0];
        return {
          success: true,
          trackingNumber: shipment.ID,
          label: shipment.ShipmentLabel?.LabelURL || "",
          createdDate: new Date().toISOString(),
        };
      }

      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
    } catch (error) {
      console.error("Aramex Return Shipment Error:", error.response?.data || error.message);
      throw new Error(`Failed to create return shipment: ${error.message}`);
    }
  }

  /**
   * Calculate shipping rates
   * @param {Object} rateData - Rate calculation details
   * @returns {Promise<Object>} - Calculated rates
   */
  async calculateRate(rateData) {
    try {
      const payload = {
        ClientInfo: this.clientInfo,
        Transaction: {
          Reference1: rateData.orderId || "RATE-UNKNOWN",
        },
        OriginAddress: this.formatAddress(rateData.senderAddress),
        DestinationAddress: this.formatAddress(rateData.receiverAddress),
        ShipmentDetails: {
          Weight: {
            Value: parseFloat(rateData.weight) || 1.0,
            Unit: "KG",
          },
          NumberOfPieces: parseInt(rateData.boxNum, 10) || 1,
          ProductGroup: rateData.productGroup || "EXP",
          ProductType: rateData.productType || "OND",
          PaymentType: rateData.paymentType || "P",
        },
      };

      const response = await this.client.post("/Rate/CalculateRate", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.data?.HasErrors) {
        throw new Error(
          response.data.Notifications?.map((n) => n.Message).join(", ") ||
            "Rate calculation failed"
        );
      }

      return {
        success: true,
        rate: response.data?.TotalAmount?.Value || 0.0,
        currency: response.data?.TotalAmount?.CurrencyCode || "SAR",
      };
    } catch (error) {
      console.error("Aramex Rate Error:", error.response?.data || error.message);
      throw new Error(`Failed to calculate rate: ${error.message}`);
    }
  }

  /**
   * Format shipment data
   * @param {Object} shipment - Shipment data from Aramex
   * @returns {Object} - Formatted shipment data
   */
  _formatShipmentData(shipment) {
    return {
      trackingNumber: shipment.ID,
      reference: shipment.Reference1,
      pieces: shipment.NumberOfPieces,
      codAmount: shipment.CashOnDeliveryAmount?.Value || 0.0,
      description: shipment.DescriptionOfGoods,
      recipientName: shipment.Consignee?.PartyAddress?.Name,
      origin: {
        city: shipment.Shipper?.PartyAddress?.City,
        country: shipment.Shipper?.PartyAddress?.CountryCode,
      },
      destination: {
        city: shipment.Consignee?.PartyAddress?.City,
        country: shipment.Consignee?.PartyAddress?.CountryCode,
      },
      isDelivered: shipment.Status === "Delivered" || false,
      updates:
        shipment.Updates?.map((update) => ({
          dateTime: new Date(update.UpdateDateTime),
          description: update.UpdateDescription,
          location: update.Location,
        })) || [],
    };
  }

  /**
   * الحصول على قائمة الدول والعملات المدعومة
   * @returns {Promise<Array>} قائمة الدول والعملات
   */
  async getCurrencyCountryLookup() {
    try {
      const payload = {
        ClientInfo: this.clientInfo,
        Transaction: {
          Reference1: "COUNTRY_CURRENCY_LOOKUP",
        },
      };

      // Hypothetical endpoint; replace with actual Aramex endpoint
      const response = await this.client.post("/Location/CountriesCurrencies", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        validateStatus: (status) => status < 500,
      });

      if (response.data?.HasErrors) {
        throw new Error(
          response.data.Notifications?.map((n) => n.Message).join(", ") ||
            "Failed to fetch countries and currencies"
        );
      }

      return response.data.Countries?.map((item) => ({
        countryName: item.Name || "Not Specified",
        countryCode: item.Code || "XX", // ISO 3166-1 Alpha-2 Code
        currency: item.CurrencyName || "Not Specified",
        currencyCode: item.CurrencyCode || "XXX", // ISO 4217 Currency Code
      })) || [];
    } catch (error) {
      console.error(
        "Aramex Currency Lookup Error:",
        error.response?.data || error.message
      );
      throw new Error(
        `فشل في الحصول على قائمة الدول والعملات: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * الحصول على نوع المنتج حسب نوع الشحن
   * @param {String} shippingType نوع الشحن
   * @returns {String} نوع المنتج
   */
  getProductType(shippingType) {
    const types = {
      express: "PPX", // Priority Parcel Express
      priority: "PPX", // Priority Parcel Express
      freight: "CDA", // Economy Delivery (Freight equivalent)
      deferred: "ECO", // Economy Delivery
    };
    return types[shippingType?.toLowerCase()] || "PPX"; // Default to PPX
  }

}

module.exports = new AramexService();