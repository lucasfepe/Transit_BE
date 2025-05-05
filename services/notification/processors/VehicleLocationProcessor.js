// services/notification/processors/VehicleLocationProcessor.js
import { getUserModel } from "../../../models/User.js";
import { getSubscriptionModel } from "../../../models/Subscription.js";
import { getStopModel } from "../../../models/Stop.js";
import tripMappingService from "../../tripMapping.service.js";
import GeospatialUtils from "../utils/GeospatialUtils.js";
import QueueProcessor from "./QueueProcessor.js";
import TokenManager from "../utils/TokenManager.js";

class VehicleLocationProcessor {
  constructor() {
    this.geospatialUtils = new GeospatialUtils();
    this.queueProcessor = new QueueProcessor();
    this.tokenManager = new TokenManager();
  }

  async process(vehicles) {
    try {
      console.log(`Processing ${vehicles ? vehicles.length : 0} vehicles`);

      if (!vehicles || vehicles.length === 0) {
        return;
      }

      // Get current time (system timezone initially)
      const now = new Date();

      // Format the date and time in Calgary's timezone (America/Edmonton) for display
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Edmonton', // Calgary's timezone
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // 24-hour format
      });

      // Extract formatted components for display
      const formattedParts = formatter.formatToParts(now);
      const dateComponents = {
        year: formattedParts.find(p => p.type === 'year').value,
        month: formattedParts.find(p => p.type === 'month').value,
        day: formattedParts.find(p => p.type === 'day').value,
        hour: formattedParts.find(p => p.type === 'hour').value,
        minute: formattedParts.find(p => p.type === 'minute').value,
        second: formattedParts.find(p => p.type === 'second').value
      };

      // Display formatted date in Calgary time
      const formattedDate = `${dateComponents.month}/${dateComponents.day}/${dateComponents.year} ${dateComponents.hour}:${dateComponents.minute}:${dateComponents.second}`;
      console.log(`Formatted Date (Calgary): ${formattedDate}`);

      // For filtering subscriptions, approximate a Date object in Calgary time
      // This is a workaround since native JS can't directly set timezone for Date objects
      // Calgary is typically UTC-7 (MST) or UTC-6 (MDT) depending on Daylight Saving Time
      // Intl.DateTimeFormat handles DST automatically, so we use its output to build a timestamp
      // Properly format the date string with padded values for month and day
      const calgaryTimeString = `${dateComponents.year}-${dateComponents.month.toString().padStart(2, '0')}-${dateComponents.day.toString().padStart(2, '0')}T${dateComponents.hour.toString().padStart(2, '0')}:${dateComponents.minute.toString().padStart(2, '0')}:${dateComponents.second.toString().padStart(2, '0')}`;
      console.log(`Calgary Time String: ${calgaryTimeString}`);
      const calgaryDateForLogic = new Date(calgaryTimeString);
      console.log(`Calgary Date for Logic: ${calgaryDateForLogic.toISOString()}`);
      // Warning: This is an approximation and may not account for DST perfectly in logic.
      // For precise logic with subscriptions, use a library like moment-timezone.

      // Get all active subscriptions (no caching)
      const Subscription = getSubscriptionModel();
      const activeSubscriptions = await Subscription.find({ active: true });
      console.log(`Active subscriptions: ${activeSubscriptions.length}`);

      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        return; // No active subscriptions, no need to process vehicles
      }

      // Filter subscriptions by day of week and time of day using Calgary time
      const timeFilteredSubscriptions = activeSubscriptions.filter(
        (subscription) => {
          // Use the subscription's isActiveAtTime method with Calgary-adjusted time
          return subscription.isActiveAtTime(calgaryDateForLogic.getTime());
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

          await this._processVehicleSubscriptions(
            vehicle,
            routeSubscriptions,
            userMap,
            calgaryDateForLogic, // Pass Calgary-adjusted time for consistency
            subscriptionsToUpdate
          );
        })
      );

      console.log(`Added ${this.queueProcessor.notificationQueue.length} notifications to queue`);
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
      if (this.queueProcessor.notificationQueue.length > 0) {
        console.log(`Processing ${this.queueProcessor.notificationQueue.length} notifications`);
        await this.queueProcessor.processQueue();
      } else {
        console.log('No notifications to process');
      }
    } catch (error) {
      console.error("Error processing vehicle locations:", error);
    }
  }

  // Helper method to process subscriptions for a vehicle
  async _processVehicleSubscriptions(vehicle, routeSubscriptions, userMap, now, subscriptionsToUpdate) {
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

    // Get route details and process stops
    await this._processRouteAndStops(
      vehicle,
      eligibleSubscriptions,
      userMap,
      subscriptionsToUpdate
    );
  }

  // Helper method to process route details and stops
  async _processRouteAndStops(vehicle, eligibleSubscriptions, userMap, subscriptionsToUpdate) {
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
      const distance = this.geospatialUtils.calculateDistance(
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

    // Process all stops and prepare notifications
    for (const stop of stopsWithDistance) {
      this._processStopAndPrepareNotifications(
        stop,
        subscriptionsByStop,
        userMap,
        vehicle,
        subscriptionsToUpdate
      );
    }
  }

  // Helper method to process a stop and prepare notifications
  _processStopAndPrepareNotifications(stop, subscriptionsByStop, userMap, vehicle, subscriptionsToUpdate) {
    // Get subscriptions for this stop
    const stopSubscriptions = subscriptionsByStop[stop.stopId];

    if (!stopSubscriptions || stopSubscriptions.length === 0) {
      console.log(`No subscriptions found for stop ${stop.stopId}`);
      return;
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

      this._prepareNotificationsForUser(
        user,
        subscription,
        vehicle,
        stop,
        subscriptionsToUpdate
      );
    }
  }

  // Helper method to prepare notifications for a user
  _prepareNotificationsForUser(user, subscription, vehicle, stop, subscriptionsToUpdate) {
    // Send notification to all user's valid devices
    if (user.pushTokens && user.pushTokens.length > 0) {
      // Separate Expo and FCM tokens
      const expoTokens = [];
      const fcmTokens = [];

      for (const tokenObj of user.pushTokens) {
        const token = tokenObj.token;
        console.log(`Checking token for user ${user.firebaseUid}: ${token}`);

        // services/notification/processors/VehicleLocationProcessor.js (continued)
        if (this.tokenManager.isExpoToken(token)) {
          console.log(`Valid Expo push token found: ${token}`);
          expoTokens.push(token);
        } else if (token) {
          console.log(`FCM token found: ${token}`);
          fcmTokens.push(token);
        }
      }

      // Get user's notification preferences
      const soundEnabled = user.notificationSettings?.soundEnabled !== false;
      const vibrationEnabled = user.notificationSettings?.vibrationEnabled !== false;

      // Create the notification message template
      const messageTemplate = {
        sound: soundEnabled ? "default" : null,
        title: "Your Transit is Approaching",
        body: `Route ${vehicle.routeId} is approaching stop #${stop.stopId} (${Math.round(stop.distance)}m away)`,
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

      // Add Expo notifications to queue
      for (const token of expoTokens) {
        const expoMessage = {
          ...messageTemplate,
          to: token
        };
        this.queueProcessor.addToQueue(expoMessage);
      }

      // Add FCM notifications to queue
      for (const token of fcmTokens) {
        const fcmMessage = {
          ...messageTemplate,
          to: token
        };
        this.queueProcessor.addToQueue(fcmMessage);
      }

      console.log(`Added ${expoTokens.length + fcmTokens.length} notifications to queue for user ${user.firebaseUid}`);
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

export default VehicleLocationProcessor;