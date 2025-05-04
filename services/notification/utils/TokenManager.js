// services/notification/utils/TokenManager.js
import { getUserModel } from "../../../models/User.js";

class TokenManager {
  // Check if a token is an Expo push token
  isExpoToken(token) {
    return token && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
  }

  // Extract the actual token from Expo token format
  extractTokenFromExpoToken(expoToken) {
    // Expo tokens are in format ExponentPushToken[xxxxxxxx]
    const match = expoToken.match(/$$([^$$]+)\]/);
    if (match && match[1]) {
      return match[1];
    }
    // If not an Expo token format, return as is
    return expoToken;
  }

  // Remove an invalid token from all users
  async removeInvalidToken(token) {
    try {
      const User = getUserModel();

      // Find and remove this token from any users
      const result = await User.updateMany(
        { 'pushTokens.token': token },
        { $pull: { pushTokens: { token: token } } }
      );

      console.log(`Removed invalid token ${token} from ${result.modifiedCount} users`);
      return result.modifiedCount > 0;
    } catch (error) {
      console.error(`Error removing invalid token ${token}:`, error);
      return false;
    }
  }
}

export default TokenManager;