// services/notification.service.js
import { Expo } from 'expo-server-sdk';
import { getUserModel } from '../models/User.js';
import { getSubscriptionModel } from '../models/Subscription.js';
import { getStopModel } from '../models/Stop.js';
import tripMappingService from '../services/tripMapping.service.js';

class NotificationService {
  constructor() {
    this.expo = new Expo();
    this.notificationQueue = [];
    this.processingQueue = false;
  }
  
  // Process vehicle locations and send notifications
  async processVehicleLocations(vehicles) {
    try {
      if (!vehicles || vehicles.length === 0) {
        return;
      }
      
      // Get current time info for filtering
      const now = new Date();
      const currentDay = now.getDay(); // 0-6, Sunday is 0
      
      // Get all active subscriptions (no caching)
      const Subscription = getSubscriptionModel();
      const activeSubscriptions = await Subscription.find({ active: true });
      
      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        return; // No active subscriptions, no need to process vehicles
      }
      
      // Filter subscriptions by day of week and time of day first
      const timeFilteredSubscriptions = activeSubscriptions.filter(subscription => {
        // Use the subscription's isActiveAtTime method to check time windows
        return subscription.isActiveAtTime(now.getTime());
      });
      
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
      
      // Filter vehicles to only those with routes that have subscriptions
      const relevantVehicles = vehicles.filter(vehicle => 
        vehicle.routeId && routesWithSubscriptions.includes(vehicle.routeId)
      );
      
      if (relevantVehicles.length === 0) {
        return; // No vehicles on routes with subscriptions
      }
      
      const Stop = getStopModel();
      const User = getUserModel();
      
      // Fetch all users with active subscriptions to avoid multiple DB queries
      const userIds = [...new Set(timeFilteredSubscriptions.map(sub => sub.userId))];
      const users = await User.find({ 
        firebaseUid: { $in: userIds },
        notificationsEnabled: true // Only get users with notifications enabled
      });
      
      // Create a map for faster user lookup
      const userMap = {};
      for (const user of users) {
        userMap[user.firebaseUid] = user;
      }
      
      // Process only relevant vehicles
      await Promise.all(relevantVehicles.map(async (vehicle) => {
        // Get subscriptions for this route
        const routeSubscriptions = subscriptionsByRoute[vehicle.routeId];
        
        if (!routeSubscriptions || routeSubscriptions.length === 0) {
          return;
        }
        
        // Filter subscriptions by users with notifications enabled and throttling
        const eligibleSubscriptions = routeSubscriptions.filter(sub => {
          const user = userMap[sub.userId];
          if (!user) return false; // User not found or notifications disabled
          
          // Get user's minimum time between notifications
          const minTimeBetweenNotifications = user.notificationSettings?.minTimeBetweenNotifications || 10;
          
          // Check if this vehicle has already been notified for this subscription
          if (sub.lastNotifiedVehicleId === vehicle.id) {
            return false;
          }
          
          // Check if enough time has passed since last notification
          if (sub.lastNotifiedAt) {
            const minTimeMs = minTimeBetweenNotifications * 60 * 1000;
            const timeSinceLastNotification = now - new Date(sub.lastNotifiedAt);
            
            if (timeSinceLastNotification < minTimeMs) {
              return false;
            }
          }
          
          return true;
        });
        
        if (eligibleSubscriptions.length === 0) {
          return; // No eligible subscriptions for this vehicle
        }
        
        // Get unique stop IDs from eligible subscriptions
        const subscribedStopIds = [...new Set(eligibleSubscriptions.map(sub => sub.stop_id))];
        
        // Get route details
        const routeDetails = await tripMappingService.getRouteDetails(vehicle.routeId);
        
        if (!routeDetails || !routeDetails.stops || routeDetails.stops.length === 0) {
          return;
        }
        
        // Filter stops to only those with subscriptions
        const relevantStops = routeDetails.stops.filter(stop => 
          subscribedStopIds.includes(stop.stop_id)
        );
        
        if (relevantStops.length === 0) {
          return;
        }
        
        // Calculate distance only for relevant stops
        const stopsWithDistance = relevantStops.map(stop => ({
          stopId: stop.stop_id,
          stopName: stop.stop_name,
          distance: this.calculateDistance(
            vehicle.latitude,
            vehicle.longitude,
            stop.stop_lat,
            stop.stop_lon
          )
        }));
        
        // Group subscriptions by stop_id for faster lookup
        const subscriptionsByStop = {};
        for (const sub of eligibleSubscriptions) {
          if (!subscriptionsByStop[sub.stop_id]) {
            subscriptionsByStop[sub.stop_id] = [];
          }
          subscriptionsByStop[sub.stop_id].push(sub);
        }
        
        // Process all stops
        await Promise.all(stopsWithDistance.map(async (stop) => {
          // Get subscriptions for this stop
          const stopSubscriptions = subscriptionsByStop[stop.stopId];
          
          if (!stopSubscriptions || stopSubscriptions.length === 0) {
            return;
          }
          
          // Process all subscriptions for this stop
          const subscriptionPromises = stopSubscriptions.map(async (subscription) => {
            // Get user
            const user = userMap[subscription.userId];
            
            if (!user || !user.pushTokens || user.pushTokens.length === 0) {
              return;
            }
            
            // Check if vehicle is within user's notification distance
            const userDistance = user.notificationSettings?.distance || 1000;
            if (stop.distance > userDistance) {
              return; // Vehicle is too far from stop based on user settings
            }
            
            // Queue notifications for each token
            for (const tokenObj of user.pushTokens) {
              const token = tokenObj.token;
              
              // Validate token
              if (!Expo.isExpoPushToken(token)) {
                console.warn(`Invalid Expo push token for user ${user._id}: ${token}`);
                continue;
              }
              
              // Get user's sound preference
              const soundEnabled = user.notificationSettings?.soundEnabled !== false;
              
              // Get user's vibration preference
              const vibrationEnabled = user.notificationSettings?.vibrationEnabled !== false;
              
              // Create notification message
              const message = {
                to: token,
                sound: soundEnabled ? 'default' : null,
                title: 'Your Transit is Approaching',
                body: `Route ${vehicle.routeId} is approaching stop #${stop.stopId} (${Math.round(stop.distance)}m away)`,
                data: {
                  routeId: vehicle.routeId,
                  stopId: stop.stopId,
                  vehicleId: vehicle.id,
                  distance: Math.round(stop.distance),
                  vibrate: vibrationEnabled
                },
                priority: 'high'
              };
              
              // Add to queue
              this.notificationQueue.push(message);
            }
            
            // Update subscription with last notification info
            subscription.lastNotifiedVehicleId = vehicle.id;
            subscription.lastNotifiedAt = new Date();
            subscription.notificationCount = (subscription.notificationCount || 0) + 1;
            return subscription.save();
          });
          
          // Wait for all subscription processing to complete
          await Promise.all(subscriptionPromises);
        }));
      }));
      
      // Process the queue if not already processing
      if (this.notificationQueue.length > 0 && !this.processingQueue) {
        await this.processNotificationQueue();
      }
      
    } catch (error) {
      console.error('Error processing vehicle locations for notifications:', error);
    }
  }
  
  // Process notification queue
  async processNotificationQueue() {
    try {
      if (this.processingQueue) {
        return;
      }
      
      this.processingQueue = true;
      
      // Create chunks of notifications (Expo has a limit)
      const chunks = this.expo.chunkPushNotifications(this.notificationQueue);
      
      // Clear the queue
      this.notificationQueue = [];
      
      // Send each chunk
      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          // console.log('Notifications sent:', ticketChunk.length);
          
          // Handle tickets (for error checking, etc.)
          for (let i = 0; i < ticketChunk.length; i++) {
            const ticket = ticketChunk[i];
            
            if (ticket.status === 'error') {
              console.error(`Error sending notification: ${ticket.message}`);
              
              // Handle specific errors
              if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
                // Remove invalid token
                const token = chunk[i].to;
                await this.removeInvalidToken(token);
              }
            }
          }
        } catch (error) {
          console.error('Error sending notification chunk:', error);
        }
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }
  
  // Remove invalid token
  async removeInvalidToken(token) {
    try {
      const User = getUserModel();
      
      // Find and update user with this token
      await User.updateMany(
        { 'pushTokens.token': token },
        { $pull: { pushTokens: { token } } }
      );
      
      console.log(`Removed invalid token: ${token}`);
    } catch (error) {
      console.error('Error removing invalid token:', error);
    }
  }
  
  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }
}

const notificationService = new NotificationService();
export default notificationService;