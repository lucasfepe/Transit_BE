// services/notification.service.js
import { Expo } from "expo-server-sdk";
import { getUserModel } from "../models/User.js";
import { getSubscriptionModel } from "../models/Subscription.js";
import { getStopModel } from "../models/Stop.js";
import tripMappingService from "../services/tripMapping.service.js";
import admin from "../firebaseAdmin.js";

// Log environment information
console.log(`Running in ${process.env.NODE_ENV || 'development'} environment`);

// Test Expo connection at startup
async function testExpoConnection() {
  try {
    const expo = new Expo();
    console.log("Testing Expo connection...");
    // Simple test to see if we can create a valid message
    const message = {
      to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]", // This is just a dummy token for testing
      body: "Test message",
      data: { test: true },
    };

    // This will throw an error if there's a connection issue
    expo.chunkPushNotifications([message]);
    console.log("Expo connection test successful");
  } catch (error) {
    console.error("Expo connection test failed:", error);
  }
}

testExpoConnection();

class NotificationService {
  constructor() {
    this.expo = new Expo();
    this.notificationQueue = [];
    this.processingQueue = false;
  }
  isExpoToken(token) {
    return token && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
  }

  async sendFCMNotification(token, title, body, data = {}) {
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


  // Process vehicle locations and send notifications
  async processVehicleLocations(vehicles) {
    try {
      console.log(`Processing ${vehicles ? vehicles.length : 0} vehicles`);

      if (!vehicles || vehicles.length === 0) {
        return;
      }

      // Get current time info for filtering
      const now = new Date();

      // Get all active subscriptions (no caching)
      const Subscription = getSubscriptionModel();
      const activeSubscriptions = await Subscription.find({ active: true });
      console.log(`Active subscriptions: ${activeSubscriptions.length}`);

      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        return; // No active subscriptions, no need to process vehicles
      }

      // Filter subscriptions by day of week and time of day first
      const timeFilteredSubscriptions = activeSubscriptions.filter(
        (subscription) => {
          // Use the subscription's isActiveAtTime method to check time windows
          return subscription.isActiveAtTime(now.getTime());
        }
      );
      console.log(`Time-filtered subscriptions: ${timeFilteredSubscriptions.length}`);

      if (timeFilteredSubscriptions.length === 0) {
        return; // No subscriptions active at the current time
      }

      // Group subscriptions by route_id for faster lookup
      const subscriptionsByRoute = {};
      for (const sub of timeFilteredSubscriptions) {
        if (!subscriptionsByRoute[sub.route_id]) {
          subscriptionsByRoute[sub.route_id] = [];
        }
        subscriptionsByRoute[sub.route_id].push(sub);
      }

      // Get unique route IDs that have subscriptions
      const routesWithSubscriptions = Object.keys(subscriptionsByRoute);
      console.log(`Routes with subscriptions: ${routesWithSubscriptions.join(', ')}`);

      // Filter vehicles to only those with routes that have subscriptions
      const relevantVehicles = vehicles.filter(
        (vehicle) =>
          vehicle.routeId && routesWithSubscriptions.includes(vehicle.routeId)
      );
      console.log(`Found ${relevantVehicles.length} relevant vehicles with subscriptions`);

      if (relevantVehicles.length === 0) {
        return; // No vehicles on routes with subscriptions
      }

      const Stop = getStopModel();
      const User = getUserModel();

      // Fetch all users with active subscriptions to avoid multiple DB queries
      const userIds = [
        ...new Set(timeFilteredSubscriptions.map((sub) => sub.userId)),
      ];
      const users = await User.find({
        firebaseUid: { $in: userIds },
        notificationsEnabled: true, // Only get users with notifications enabled
      });
      console.log(`Found ${users.length} users with notifications enabled`);

      // Create a map for faster user lookup
      const userMap = {};
      for (const user of users) {
        userMap[user.firebaseUid] = user;
      }

      // Track subscriptions that need to be updated (using a Map to avoid duplicates)
      const subscriptionsToUpdate = new Map();

      // Process only relevant vehicles
      await Promise.all(
        relevantVehicles.map(async (vehicle) => {
          console.log(`Processing vehicle for route ${vehicle.routeId}`);

          // Get subscriptions for this route
          const routeSubscriptions = subscriptionsByRoute[vehicle.routeId];

          if (!routeSubscriptions || routeSubscriptions.length === 0) {
            console.log(`No subscriptions found for route ${vehicle.routeId}`);
            return;
          }

          // Filter subscriptions by users with notifications enabled and time interval
          const eligibleSubscriptions = routeSubscriptions.filter((sub) => {
            const user = userMap[sub.userId];
            if (!user) {
              console.log(`User not found for subscription: ${sub._id}`);
              return false; // User not found or notifications disabled
            }

            // Get user's notification interval setting (in minutes)
            const notificationInterval =
              user.notificationSettings?.minTimeBetweenNotifications !== undefined
                ? user.notificationSettings.minTimeBetweenNotifications
                : 5;

            // Check if enough time has passed since last notification based on user's interval setting
            if (sub.lastNotifiedAt) {
              const intervalMs = notificationInterval * 60 * 1000;
              const timeSinceLastNotification =
                now - new Date(sub.lastNotifiedAt);

              if (timeSinceLastNotification < intervalMs) {
                console.log(`Not enough time passed for subscription ${sub._id}, last notified: ${sub.lastNotifiedAt}`);
                return false; // Not enough time has passed since last notification
              }
            }

            return true;
          });
          console.log(`Found ${eligibleSubscriptions.length} eligible subscriptions for route ${vehicle.routeId}`);

          if (eligibleSubscriptions.length === 0) {
            return; // No eligible subscriptions for this vehicle
          }

          // Get unique stop IDs from eligible subscriptions
          const subscribedStopIds = [
            ...new Set(eligibleSubscriptions.map((sub) => sub.stop_id)),
          ];
          console.log(`Subscribed stop IDs for route ${vehicle.routeId}: ${subscribedStopIds.join(', ')}`);

          // Get route details
          const routeDetails = await tripMappingService.getRouteDetails(
            vehicle.routeId
          );

          if (
            !routeDetails ||
            !routeDetails.stops ||
            routeDetails.stops.length === 0
          ) {
            console.log(`No route details found for route ${vehicle.routeId}`);
            return;
          }

          const stopsMap = {};
          routeDetails.stops.forEach((stop) => {
            stopsMap[stop.stop_id] = stop;
          });

          // Map subscribedStopIds to their corresponding stop objects
          const relevantStops = subscribedStopIds
            .map((stopId) => stopsMap[Number(stopId)] || stopsMap[stopId])
            .filter((stop) => stop !== undefined);

          if (relevantStops.length === 0) {
            console.log(`No relevant stops found for route ${vehicle.routeId}`);
            return;
          }
          console.log(`Found ${relevantStops.length} relevant stops for route ${vehicle.routeId}`);

          // Calculate distance only for relevant stops
          const stopsWithDistance = relevantStops.map((stop) => {
            const distance = this.calculateDistance(
              vehicle.latitude,
              vehicle.longitude,
              stop.stop_lat,
              stop.stop_lon
            );
            console.log(`Distance from vehicle to stop ${stop.stop_id}: ${distance}m`);
            return {
              stopId: stop.stop_id,
              stopName: stop.stop_name,
              distance: distance,
              stop_lat: stop.stop_lat,
              stop_lon: stop.stop_lon,
            };
          });

          // Group subscriptions by stop_id for faster lookup
          const subscriptionsByStop = {};
          for (const sub of eligibleSubscriptions) {
            if (!subscriptionsByStop[sub.stop_id]) {
              subscriptionsByStop[sub.stop_id] = [];
            }
            subscriptionsByStop[sub.stop_id].push(sub);
          }

          // Process all stops
          for (const stop of stopsWithDistance) {
            // Get subscriptions for this stop
            const stopSubscriptions = subscriptionsByStop[stop.stopId];

            if (!stopSubscriptions || stopSubscriptions.length === 0) {
              console.log(`No subscriptions found for stop ${stop.stopId}`);
              continue;
            }
            console.log(`Found ${stopSubscriptions.length} subscriptions for stop ${stop.stopId}`);

            // Process all subscriptions for this stop
            for (const subscription of stopSubscriptions) {
              // Get user
              const user = userMap[subscription.userId];

              if (!user || !user.pushTokens || user.pushTokens.length === 0) {
                console.log(`No valid user or push tokens for subscription ${subscription._id}`);
                continue;
              }

              // Check if vehicle is within user's notification distance
              const userDistance = user.notificationSettings?.distance || 1000;
              console.log(`User distance threshold: ${userDistance}m, actual distance: ${stop.distance}m`);

              if (stop.distance > userDistance) {
                console.log(`Vehicle too far from stop ${stop.stopId} for user ${user.firebaseUid}`);
                continue; // Vehicle is too far from stop based on user settings
              }

              // Send only one notification per user, using the first valid token
              if (user.pushTokens && user.pushTokens.length > 0) {
                // Find the first valid token
                let validToken = null;
                for (const tokenObj of user.pushTokens) {
                  const token = tokenObj.token;
                  console.log(`Checking token for user ${user.firebaseUid}: ${token}`);

                  if (Expo.isExpoPushToken(token)) {
                    console.log(`Valid Expo push token found: ${token}`);
                    validToken = token;
                    break; // Stop after finding the first valid token
                  } else {
                    console.warn(`Invalid Expo push token for user ${user._id}: ${token}`);
                  }
                }

                // If we found a valid token, send the notification
                if (validToken) {
                  // Get user's sound preference
                  const soundEnabled =
                    user.notificationSettings?.soundEnabled !== false;

                  // Get user's vibration preference
                  const vibrationEnabled =
                    user.notificationSettings?.vibrationEnabled !== false;
                  console.log("stop:", stop);
                  console.log("stop.lat:", stop.stop_lat, "stop.lon:", stop.stop_lon);
                  // Create notification message
                  const message = {
                    to: validToken,
                    sound: soundEnabled ? "default" : null,
                    title: "Your Transit is Approaching",
                    body: `Route ${vehicle.routeId} is approaching stop #${stop.stopId
                      } (${Math.round(stop.distance)}m away)`,
                    data: {
                      routeId: vehicle.routeId,
                      stopId: stop.stopId,
                      vehicleId: vehicle.id,
                      distance: Math.round(stop.distance),
                      vibrate: vibrationEnabled,
                      subscriptionId: subscription._id,
                      type: "proximity_alert",
                      stop_lat: stop.stop_lat,
                      stop_lon: stop.stop_lon,
                    },
                    priority: "high",
                  };

                  console.log(`Adding notification for user ${user.firebaseUid}, route ${vehicle.routeId}, stop ${stop.stopId}, distance ${Math.round(stop.distance)}m`);
                  // Add to queue
                  this.notificationQueue.push(message);
                }
              }

              // Instead of saving immediately, add to the map of subscriptions to update
              // Use subscription ID as key to ensure each subscription is only updated once
              subscriptionsToUpdate.set(subscription._id.toString(), {
                subscription,
                lastNotifiedAt: new Date(),
                notificationCount: (subscription.notificationCount || 0) + 1
              });
            }
          }
        })
      );

      console.log(`Added ${this.notificationQueue.length} notifications to queue`);
      console.log(`Need to update ${subscriptionsToUpdate.size} subscriptions`);

      // Now update all subscriptions in sequence to avoid parallel save errors
      for (const [id, data] of subscriptionsToUpdate.entries()) {
        try {
          const { subscription, lastNotifiedAt, notificationCount } = data;
          subscription.lastNotifiedAt = lastNotifiedAt;
          subscription.notificationCount = notificationCount;
          await subscription.save();
          console.log(`Updated subscription ${id}`);
        } catch (error) {
          console.error(`Error updating subscription ${id}:`, error);
        }
      }

      // Process the notification queue if there are any notifications
      if (this.notificationQueue.length > 0) {
        console.log(`Processing ${this.notificationQueue.length} notifications`);
        await this.processNotificationQueue();
      } else {
        console.log('No notifications to process');
      }
    } catch (error) {
      console.error("Error processing vehicle locations:", error);
    }
  }

  // Process notification queue with retry mechanism
  // Process notification queue with retry mechanism
  async processNotificationQueue(retryCount = 0) {
    try {
      if (this.processingQueue) {
        console.log('Queue is already being processed, skipping');
        return;
      }

      this.processingQueue = true;
      console.log(`Processing notification queue with ${this.notificationQueue.length} messages (retry: ${retryCount})`);

      // Separate Expo tokens from FCM tokens
      const expoNotifications = this.notificationQueue.filter(msg => this.isExpoToken(msg.to));
      const fcmNotifications = this.notificationQueue.filter(msg => !this.isExpoToken(msg.to));

      console.log(`Found ${expoNotifications.length} Expo notifications and ${fcmNotifications.length} FCM notifications`);

      // Clear the queue
      const notificationsToProcess = [...this.notificationQueue];
      this.notificationQueue = [];

      // Store failed notifications for retry
      const failedNotifications = [];

      // Process Expo notifications
      if (expoNotifications.length > 0) {
        try {
          // Create chunks of notifications (Expo has a limit)
          const chunks = this.expo.chunkPushNotifications(expoNotifications);
          console.log(`Created ${chunks.length} Expo chunks for sending`);

          // Send each chunk
          for (const chunk of chunks) {
            try {
              console.log(`Sending Expo chunk with ${chunk.length} notifications`);
              const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
              console.log(`Successfully sent ${ticketChunk.length} Expo notifications`);

              // Handle tickets (for error checking, etc.)
              for (let i = 0; i < ticketChunk.length; i++) {
                const ticket = ticketChunk[i];

                if (ticket.status === "error") {
                  console.error(`Error sending Expo notification: ${ticket.message}`);

                  // Add to failed notifications for retry
                  failedNotifications.push(chunk[i]);

                  // Handle specific errors
                  if (ticket.details && ticket.details.error === "DeviceNotRegistered") {
                    // Remove invalid token
                    const token = chunk[i].to;
                    await this.removeInvalidToken(token);
                  }
                }
              }
            } catch (error) {
              console.error("Error sending Expo notification chunk:", error);
              // Add all notifications in this chunk to failed notifications
              failedNotifications.push(...chunk);
            }
          }
        } catch (error) {
          console.error("Error processing Expo notifications:", error);
          failedNotifications.push(...expoNotifications);
        }
      }

      // Process FCM notifications
      if (fcmNotifications.length > 0) {
        console.log(`Processing ${fcmNotifications.length} FCM notifications`);

        // Process FCM notifications one by one to avoid batch failures
        for (const notification of fcmNotifications) {
          try {
            // Convert the Expo notification format to FCM format
            const success = await this.sendFCMNotification(
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
          this.processNotificationQueue(retryCount + 1);
        }, 5000); // Wait 5 seconds before retrying
      }
    } catch (error) {
      console.error("Error processing notification queue:", error);
    } finally {
      this.processingQueue = false;
    }
  }

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

  extractTokenFromExpoToken(expoToken) {
    // Expo tokens are in format ExponentPushToken[xxxxxxxx]
    // Extract the actual token part inside the brackets
    const match = expoToken.match(/$$([^$$]+)\]/);
    if (match && match[1]) {
      return match[1];
    }
    // If not an Expo token format, return as is
    return expoToken;
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Method to directly test sending a notification to a specific token
  async sendTestNotification(token) {
    if (!token) {
      console.error('No token provided for test notification');
      return false;
    }

    const isExpo = this.isExpoToken(token);
    console.log(`Sending test notification to ${isExpo ? 'Expo' : 'FCM'} token: ${token}`);

    if (isExpo) {
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
    } else {
      // For FCM tokens
      return this.sendFCMNotification(
        token,
        'Test Notification',
        'This is a test notification sent via FCM',
        { test: true }
      );
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;