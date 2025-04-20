// services/subscription.service.js
import { getSubscriptionModel } from '../models/Subscription.js';
import { getRouteModel } from '../models/Route.js';
import { getStopModel } from '../models/Stop.js';

export const createSubscription = async (subscriptionData) => {
  const Subscription = getSubscriptionModel();
  
  // Set default notification settings if not provided
  if (!subscriptionData.notificationSettings) {
    subscriptionData.notificationSettings = {
      enabled: true,
      minTimeBetweenNotifications: 10,
      soundEnabled: true,
      vibrationEnabled: true
    };
  }
  
  // Set default notification distance if not provided
  if (!subscriptionData.notificationDistance) {
    subscriptionData.notificationDistance = 500; // 500 meters
  }
  
  const subscription = new Subscription(subscriptionData);
  return await subscription.save();
};

export const getSubscriptionById = async (id) => {
  const Subscription = getSubscriptionModel();
  return await Subscription.findById(id);
};

export const getSubscriptionsByUserId = async (userId) => {
  const Subscription = getSubscriptionModel();
  return await Subscription.find({ userId });
};

export const getSubscriptionsByRoute = async (routeShortName) => {
  const Subscription = getSubscriptionModel();
  return await Subscription.find({ route_id: routeShortName });
};

export const getSubscriptionsByUserAndRoute = async (userId, routeShortName) => {
  const Subscription = getSubscriptionModel();
  return await Subscription.find({ 
    userId: userId,
    route_id: routeShortName 
  });
};

export const updateSubscription = async (id, updateData) => {
  const Subscription = getSubscriptionModel();
  
  // Set updated timestamp
  updateData.updatedAt = new Date();
  
  return await Subscription.findByIdAndUpdate(id, updateData, { new: true });
};

export const deleteSubscription = async (id) => {
  const Subscription = getSubscriptionModel();
  return await Subscription.findByIdAndDelete(id);
};

export const getActiveSubscriptions = async () => {
  const Subscription = getSubscriptionModel();
  return await Subscription.find({ active: true });
};

// Helper method to check if a route exists before creating a subscription
export const validateRouteExists = async (routeShortName) => {
  const Route = getRouteModel();
  const route = await Route.findOne({ route_short_name: routeShortName });
  return !!route;
};

// Helper method to check if a stop exists before creating a subscription
export const validateStopExists = async (stopId) => {
  const Stop = getStopModel();
  const stop = await Stop.findOne({ stop_id: Number(stopId) });
  return !!stop;
};

// Get subscriptions with route and stop details
export const getSubscriptionsWithDetails = async (userId) => {
  const Subscription = getSubscriptionModel();
  const Route = getRouteModel();
  const Stop = getStopModel();
  
  const subscriptions = await Subscription.find({ userId });
  
  // Get all unique route_ids and stop_ids from subscriptions
  const routeIds = [...new Set(subscriptions.map(sub => sub.route_id))];
  const stopIds = [...new Set(subscriptions.map(sub => sub.stop_id))];
  
  // Fetch all relevant routes in one query, excluding multilinestring data
  const routes = await Route.find({ 
    route_short_name: { $in: routeIds } 
  }, {
    multilinestring: 0 
  });
  
  // Fetch all relevant stops in one query
  const stops = await Stop.find({
    stop_id: { $in: stopIds.map(id => Number(id)) } // Convert to Number since stop_id is Number in the model
  });
  
  // Create maps for quick lookup
  const routeMap = routes.reduce((map, route) => {
    map[route.route_short_name] = {
      route_short_name: route.route_short_name,
      route_long_name: route.route_long_name,
      route_category: route.route_category
    };
    return map;
  }, {});
  
  const stopMap = stops.reduce((map, stop) => {
    map[stop.stop_id] = {
      stop_name: stop.stop_name,
      stop_lat: stop.stop_lat,
      stop_lon: stop.stop_lon
    };
    return map;
  }, {});
  
  // Enhance subscriptions with route and stop details
  return subscriptions.map(subscription => {
    const subObj = subscription.toObject();
    const routeDetails = routeMap[subscription.route_id] || {};
    const stopDetails = stopMap[subscription.stop_id] || {};
    
    return {
      ...subObj,
      routeDetails,
      stopDetails
    };
  });
};

// Keep the old function name for backward compatibility
export const getSubscriptionsWithRouteDetails = getSubscriptionsWithDetails;

// NEW METHODS FOR PUSH NOTIFICATIONS

/**
 * Get active subscriptions for a specific route and stop
 */
export const getActiveSubscriptionsForRouteAndStop = async (routeId, stopId) => {
  const Subscription = getSubscriptionModel();
  
  return await Subscription.find({
    route_id: routeId,
    stop_id: stopId,
    active: true,
    'notificationSettings.enabled': true
  });
};

/**
 * Update last notification time for a subscription
 */
export const updateLastNotification = async (subscriptionId, vehicleId) => {
  const Subscription = getSubscriptionModel();
  
  return await Subscription.findByIdAndUpdate(
    subscriptionId,
    { 
      $set: { 
        lastNotifiedAt: new Date(),
        lastNotifiedVehicleId: vehicleId
      },
      $inc: { notificationCount: 1 }
    },
    { new: true }
  );
};

/**
 * Check if a subscription should receive a notification
 * based on time constraints and previous notifications
 */
export const shouldSendNotification = async (subscriptionId, vehicleId) => {
  const Subscription = getSubscriptionModel();
  const subscription = await Subscription.findById(subscriptionId);
  
  if (!subscription || !subscription.active || 
      !subscription.notificationSettings?.enabled) {
    return false;
  }
  
  // Don't notify for the same vehicle
  if (subscription.lastNotifiedVehicleId === vehicleId) {
    return false;
  }
  
  // Check time between notifications
  if (subscription.lastNotifiedAt) {
    const minTimeBetween = subscription.notificationSettings?.minTimeBetweenNotifications || 10;
    const minTimeMs = minTimeBetween * 60 * 1000;
    const timeSinceLastNotification = Date.now() - subscription.lastNotifiedAt.getTime();
    
    if (timeSinceLastNotification < minTimeMs) {
      return false;
    }
  }
  
  // Check if current time is within any of the subscription time windows
  if (subscription.times && subscription.times.length > 0) {
    const now = new Date();
    const currentDay = now.getDay(); // 0-6, Sunday-Saturday
    
    // Check if current day and time match any subscription time
    const isTimeMatch = subscription.times.some(timeWindow => {
      // Check if current day is in weekdays
      if (!timeWindow.weekdays.includes(currentDay)) {
        return false;
      }
      
      // Convert current time to Date objects for comparison
      const currentTime = new Date();
      const startTime = new Date(timeWindow.startTime);
      const endTime = new Date(timeWindow.endTime);
      
      // Set current date on start and end times for proper comparison
      startTime.setFullYear(currentTime.getFullYear());
      startTime.setMonth(currentTime.getMonth());
      startTime.setDate(currentTime.getDate());
      
      endTime.setFullYear(currentTime.getFullYear());
      endTime.setMonth(currentTime.getMonth());
      endTime.setDate(currentTime.getDate());
      
      // Check if current time is within the time window
      return currentTime >= startTime && currentTime <= endTime;
    });
    
    return isTimeMatch;
  }
  
  // If no time windows specified, allow notification at any time
  return true;
};