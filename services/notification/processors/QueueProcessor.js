// services/notification/processors/QueueProcessor.js
import ExpoProvider from '../providers/ExpoProvider.js';
import FCMProvider from '../providers/FCMProvider.js';
import TokenManager from '../utils/TokenManager.js';

class QueueProcessor {
  constructor() {
    this.expoProvider = new ExpoProvider();
    this.fcmProvider = new FCMProvider();
    this.tokenManager = new TokenManager();
    this.notificationQueue = [];
    this.processingQueue = false;
  }

  // Add a notification to the queue
  addToQueue(notification) {
    this.notificationQueue.push(notification);
  }

  // Add multiple notifications to the queue
  addMultipleToQueue(notifications) {
    this.notificationQueue.push(...notifications);
  }

  // Process notification queue with retry mechanism
  async processQueue(retryCount = 0) {
    try {
      if (this.processingQueue) {
        console.log('Queue is already being processed, skipping');
        return;
      }

      this.processingQueue = true;
      console.log(`Processing notification queue with ${this.notificationQueue.length} messages (retry: ${retryCount})`);

      // Separate Expo tokens from FCM tokens
      const expoNotifications = this.notificationQueue.filter(msg => this.tokenManager.isExpoToken(msg.to));
      const fcmNotifications = this.notificationQueue.filter(msg => !this.tokenManager.isExpoToken(msg.to));

      console.log(`Found ${expoNotifications.length} Expo notifications and ${fcmNotifications.length} FCM notifications`);

      // Clear the queue
      const notificationsToProcess = [...this.notificationQueue];
      this.notificationQueue = [];

      // Store failed notifications for retry
      const failedNotifications = [];

      // Process Expo notifications
      if (expoNotifications.length > 0) {
        const result = await this.expoProvider.sendNotifications(expoNotifications);
        
        // Handle token removal for failed notifications
        for (const failed of result.failed) {
          failedNotifications.push(failed.notification);
          
          // Check if token needs to be removed
          if (failed.details && failed.details.error === "DeviceNotRegistered") {
            await this.tokenManager.removeInvalidToken(failed.notification.to);
          }
        }
      }

      // Process FCM notifications
      if (fcmNotifications.length > 0) {
        console.log(`Processing ${fcmNotifications.length} FCM notifications`);

        // Process FCM notifications one by one to avoid batch failures
        for (const notification of fcmNotifications) {
          try {
            // Convert the notification format to FCM format
            const success = await this.fcmProvider.sendNotification(
              notification.to,
              notification.title,
              notification.body,
              notification.data || {}
            );

            if (!success) {
              failedNotifications.push(notification);
            }
          } catch (error) {
            console.error("Error sending FCM notification:", error);
            failedNotifications.push(notification);
          }

          // Add a small delay between notifications to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Retry failed notifications if there are any and we haven't exceeded retry limit
      if (failedNotifications.length > 0 && retryCount < 3) {
        console.log(`Retrying ${failedNotifications.length} failed notifications`);
        this.notificationQueue = failedNotifications;
        setTimeout(() => {
          this.processQueue(retryCount + 1);
        }, 5000); // Wait 5 seconds before retrying
      }
    } catch (error) {
      console.error("Error processing notification queue:", error);
    } finally {
      this.processingQueue = false;
    }
  }

  // Send a test notification through Expo
  async sendExpoTestNotification(token) {
    return this.expoProvider.sendTestNotification(token);
  }

  // Send a test notification through FCM
  async sendFCMTestNotification(token) {
    return this.fcmProvider.sendTestNotification(token);
  }
}

export default QueueProcessor;