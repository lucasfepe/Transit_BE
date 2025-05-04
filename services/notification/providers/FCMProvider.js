// services/notification/providers/FCMProvider.js
import admin from "../../../firebaseAdmin.js";

class FCMProvider {
  async sendNotification(token, title, body, data = {}) {
    try {
      // Ensure all data values are strings for FCM
      const fcmData = {};
      for (const key in data) {
        // Convert all values to strings as required by FCM
        fcmData[key] = data[key] === null ? '' : String(data[key]);
      }

      const message = {
        token,
        notification: {
          title,
          body
        },
        data: fcmData,
        android: {
          priority: 'high',
          notification: {
            channelId: 'transit-alerts',
            sound: data.sound !== false ? 'default' : null
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent FCM message:', response);
      return true;
    } catch (error) {
      console.error('Error sending FCM message:', error);
      return false;
    }
  }

  async sendTestNotification(token) {
    return this.sendNotification(
      token,
      'Test Notification',
      'This is a test notification sent via FCM',
      { test: true }
    );
  }
}

export default FCMProvider;