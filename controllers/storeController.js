const Store = require("../models/Store");
const SallaPlatform = require("../platforms/sallaPlatform");

const storeController = {
  // Connect a new Salla store
  async connectStore(req, res) {
    try {
      const { code, storeId } = req.body;

      // Get access token from Salla
      const tokens = await SallaPlatform.getAccessToken(
        code,
        process.env.SALLA_CLIENT_ID,
        process.env.SALLA_CLIENT_SECRET,
        process.env.SALLA_REDIRECT_URI
      );

      // Create or update store record
      const store = await Store.findOneAndUpdate(
        { sallaStoreId: storeId },
        {
          name: req.body.storeName,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          isActive: true,
        },
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        message: "Store connected successfully",
        store,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to connect store",
        error: error.message,
      });
    }
  },

  // Get all connected stores
  async getStores(req, res) {
    try {
      const stores = await Store.find({ isActive: true });
      res.json({
        success: true,
        stores,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch stores",
        error: error.message,
      });
    }
  },

  // Disconnect a store
  async disconnectStore(req, res) {
    try {
      const { storeId } = req.params;
      await Store.findByIdAndUpdate(storeId, { isActive: false });

      res.json({
        success: true,
        message: "Store disconnected successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to disconnect store",
        error: error.message,
      });
    }
  },
};

module.exports = storeController;
