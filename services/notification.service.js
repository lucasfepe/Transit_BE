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
      
      const Stop = getStopModel();
      const Subscription = getSubscriptionModel();
      const User = getUserModel();
      
      // Process vehicles in parallel
      await Promise.all(vehicles.map(async (vehicle) => {
        // Skip vehicles without route ID
        if (!vehicle.routeId) {
          return;
        }
        
        const routeDetails = await tripMappingService.getRouteDetails(vehicle.routeId);
        
        if (!routeDetails || !routeDetails.stops || routeDetails.stops.length === 0) {
          return;
        }
        
        // Calculate distance to each stop (this is CPU-bound, not I/O-bound)
        const stopsWithDistance = routeDetails.stops.map(stop => ({
          stopId: stop.stop_id,
          stopName: stop.stop_name,
          distance: this.calculateDistance(
            vehicle.latitude,
            vehicle.longitude,
            stop.stop_lat,
            stop.stop_lon
          )
        }));
        
        // Find stops within notification distance
        const nearbyStops = stopsWithDistance.filter(stop => stop.distance <= 1000);
        
        if (nearbyStops.length === 0) {
          return;
        }
        
        // Process all nearby stops in parallel
        await Promise.all(nearbyStops.map(async (stop) => {
          // Find subscriptions for this route and stop
          const subscriptions = await Subscription.find({
            route_id: vehicle.routeId,
            stop_id: stop.stopId,
            active: true,
            // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            // IN PRODUCTION UNCOMMENT THIS OR USERS WILL GET NOTIFICATIONS EVERY 30 SECONDS!!!
            // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            // $or: [
            //   { lastNotifiedVehicleId: { $ne: vehicle.id } },
            //   { lastNotifiedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } }
            // ]
          });
          
          if (!subscriptions || subscriptions.length === 0) {
            return;
          }
          
          const now = new Date();
          const currentDay = now.getDay(); // 0-6, Sunday is 0
          
          // Process all subscriptions in parallel
          const subscriptionPromises = subscriptions.map(async (subscription) => {
            // Check if any time range matches the current day and time
            let isTimeInRange = false;
            
            // Loop through each time entry in the subscription
            if (subscription.times && subscription.times.length > 0) {
              for (const timeEntry of subscription.times) {
                // Check if current day is in the weekdays array
                if (!timeEntry.weekdays.includes(currentDay)) {
                  continue;
                }
                
                // Parse start and end times
                const startTime = new Date(timeEntry.startTime);
                const endTime = new Date(timeEntry.endTime);
                
                // Check if current time is within range
                if (now >= startTime && now <= endTime) {
                  isTimeInRange = true;
                  break; // Found a matching time range, no need to check others
                }
              }
            }
            
            if (!isTimeInRange) {
              return;
            }
            
            // Get user
            const user = await User.findOne({ firebaseUid: subscription.userId });
            
            if (!user || !user.notificationsEnabled || !user.pushTokens || user.pushTokens.length === 0) {
              return;
            }
            
            // Queue notifications for each token
            for (const tokenObj of user.pushTokens) {
              const token = tokenObj.token;
              
              // Validate token
              if (!Expo.isExpoPushToken(token)) {
                console.warn(`Invalid Expo push token for user ${user._id}: ${token}`);
                continue;
              }
              
              // Create notification message
              const message = {
                to: token,
                sound: subscription.notificationSettings?.soundEnabled ? 'default' : null,
                title: 'Your Transit is Approaching',
                body: `Route ${vehicle.routeId} is approaching stop #${stop.stopId} (${Math.round(stop.distance)}m away)`,
                data: {
                  routeId: vehicle.routeId,
                  stopId: stop.stopId,
                  vehicleId: vehicle.id,
                  distance: Math.round(stop.distance)
                },
                priority: 'high'
              };
              
              // Add to queue
              this.notificationQueue.push(message);
            }
            
            // Update subscription with last notification info
            subscription.lastNotifiedVehicleId = vehicle.id;
            subscription.lastNotifiedAt = new Date();
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