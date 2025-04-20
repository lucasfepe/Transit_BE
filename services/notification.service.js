// services/notification.service.js
import { Expo } from 'expo-server-sdk';
import { getUserModel } from '../models/User.js';
import { getSubscriptionModel } from '../models/Subscription.js';
import { getStopModel } from '../models/Stop.js';

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
      
      console.log(`Processing ${vehicles.length} vehicles for notifications`);
      
      const Stop = getStopModel();
      const Subscription = getSubscriptionModel();
      const User = getUserModel();
      
      // Process each vehicle
      for (const vehicle of vehicles) {
        // Skip vehicles without route ID
        if (!vehicle.routeId) {
          continue;
        }
        
        // Find all stops for this route
        const stops = await Stop.find({ 
          route_id: vehicle.routeId 
        });
        
        if (!stops || stops.length === 0) {
          continue;
        }
        
        // Calculate distance to each stop
        const stopsWithDistance = stops.map(stop => {
          const distance = this.calculateDistance(
            vehicle.latitude,
            vehicle.longitude,
            stop.stop_lat,
            stop.stop_lon
          );
          
          return {
            stopId: stop.stop_id,
            stopName: stop.stop_name,
            distance
          };
        });
        
        // Find stops within notification distance (default 500m)
        const nearbyStops = stopsWithDistance.filter(stop => stop.distance <= 500);
        
        if (nearbyStops.length === 0) {
          continue;
        }
        
        // For each nearby stop, find active subscriptions
        for (const stop of nearbyStops) {
          // Find subscriptions for this route and stop
          const subscriptions = await Subscription.find({
            routeId: vehicle.routeId,
            stopId: stop.stopId,
            active: true,
            // Don't notify for the same vehicle within 10 minutes
            $or: [
              { lastNotifiedVehicleId: { $ne: vehicle.id } },
              { lastNotifiedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } }
            ]
          });
          
          if (!subscriptions || subscriptions.length === 0) {
            continue;
          }
          
          // Check if current time matches subscription time ranges and days
          const now = new Date();
          const currentDay = now.getDay(); // 0-6, Sunday is 0
          const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          
          // Process each subscription
          for (const subscription of subscriptions) {
            // Skip if day doesn't match
            if (!subscription.days.includes(currentDay)) {
              continue;
            }
            
            // Check if current time is within any time range
            const isTimeInRange = subscription.timeRanges.some(range => {
              return currentTime >= range.start && currentTime <= range.end;
            });
            
            if (!isTimeInRange) {
              continue;
            }
            
            // Get user
            const user = await User.findOne({ uid: subscription.userId });
            
            if (!user || !user.notificationsEnabled || !user.pushTokens || user.pushTokens.length === 0) {
              continue;
            }
            
            // Queue notifications for each token
            for (const tokenObj of user.pushTokens) {
              const token = tokenObj.token;
              
              // Validate token
              if (!Expo.isExpoPushToken(token)) {
                console.warn(`Invalid Expo push token: ${token}`);
                continue;
              }
              
              // Create notification message
              const message = {
                to: token,
                sound: 'default',
                title: 'Your Transit is Approaching',
                body: `Route ${vehicle.routeId} is approaching ${stop.stopName} (${Math.round(stop.distance)}m away)`,
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
            await subscription.save();
          }
        }
      }
      
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
          console.log('Notifications sent:', ticketChunk.length);
          
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