const axios = require("axios");

class ZadPlatform {
  static getAuthUrl(clientId, redirectUri) {
    return `https://oauth.zid.sa/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
  }

  static async getAccessToken(code, clientId, clientSecret, redirectUri) {
    const tokenUrl = "https://oauth.zid.sa/oauth/token";

    try {
      const response = await axios.post(tokenUrl, null, {
        params: {
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        },
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        console.error("Token Request Error Response:", error.response.data);
        throw new Error(
          `Token request failed: ${JSON.stringify(error.response.data)}`
        );
      } else {
        console.error("Token Request Error Details:", error.message);
        throw new Error(`Token request failed: ${error.message}`);
      }
    }
  }

  static async refreshAccessToken(
    refreshToken,
    clientId,
    clientSecret,
    redirectUri
  ) {
    const tokenUrl = "https://oauth.zid.sa/oauth/token";

    const response = await axios.post(tokenUrl, null, {
      params: {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      },
    });

    return response.data;
  }
}

module.exports = ZadPlatform;
