// services/notification/providers/ExpoProvider.js
import { Expo } from "expo-server-sdk";

class ExpoProvider {
  constructor() {
    this.expo = new Expo();
  }

  async sendNotifications(notifications) {
    if (!notifications || notifications.length === 0) {
      return { sent: [], failed: [] };
    }

    const sent = [];
    const failed = [];

    try {
      // Create chunks of notifications (Expo has a limit)
      const chunks = this.expo.chunkPushNotifications(notifications);
      console.log(`Created ${chunks.length} Expo chunks for sending`);

      // Send each chunk
      for (const chunk of chunks) {
        try {
          console.log(`Sending Expo chunk with ${chunk.length} notifications`);
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          console.log(`Successfully sent ${ticketChunk.length} Expo notifications`);

          // Handle tickets
          for (let i = 0; i < ticketChunk.length; i++) {
            const ticket = ticketChunk[i];

            if (ticket.status === "error") {
              console.error(`Error sending Expo notification: ${ticket.message}`);
              failed.push({
                notification: chunk[i],
                error: ticket.message,
                details: ticket.details
              });
            } else {
              sent.push(chunk[i]);
            }
          }
        } catch (error) {
          console.error("Error sending Expo notification chunk:", error);
          failed.push(...chunk.map(n => ({ notification: n, error: error.message })));
        }
      }
    } catch (error) {
      console.error("Error processing Expo notifications:", error);
      failed.push(...notifications.map(n => ({ notification: n, error: error.message })));
    }

    return { sent, failed };
  }

  async sendTestNotification(token) {
    if (!Expo.isExpoPushToken(token)) {
      console.error(`Invalid Expo push token: ${token}`);
      return false;
    }

    const message = {
      to: token,
      sound: 'default',
      title: 'Test Notification',
      body: 'This is a test notification',
      data: { test: true },
      priority: 'high',
    };

    try {
      const chunks = this.expo.chunkPushNotifications([message]);
      const [ticketChunk] = await Promise.all(
        chunks.map(chunk => this.expo.sendPushNotificationsAsync(chunk))
      );

      console.log('Test notification result:', ticketChunk);
      return ticketChunk[0].status === 'ok';
    } catch (error) {
      console.error('Error sending Expo test notification:', error);
      return false;
    }
  }
}

export default ExpoProvider;