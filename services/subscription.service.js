// services/subscription.service.js
import { getSubscriptionModel } from '../models/Subscription.js';
import { getRouteModel } from '../models/Route.js';
import { getStopModel } from '../models/Stop.js';

export const createSubscription = async (subscriptionData) => {
  const Subscription = getSubscriptionModel();
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