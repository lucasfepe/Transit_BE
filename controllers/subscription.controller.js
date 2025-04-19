// controllers/subscription.controller.js
import * as subscriptionService from '../services/subscription.service.js';

/**
 * Create a new subscription for the current user
 */
export const createSubscription = async (req, res, next) => {
  try {
    // Get user ID from the authenticated request
    const userId = req.user.uid;
    
    // Validate if the route exists
    const routeExists = await subscriptionService.validateRouteExists(req.body.route_id);
    if (!routeExists) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Validate if the stop exists
    const stopExists = await subscriptionService.validateStopExists(req.body.stop_id);
    if (!stopExists) {
      return res.status(404).json({ error: 'Stop not found' });
    }
    
    // Create subscription data with user ID from token
    const subscriptionData = {
      ...req.body,
      userId
    };
    
    const subscription = await subscriptionService.createSubscription(subscriptionData);
    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all subscriptions for the current user
 */
export const getUserSubscriptions = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const subscriptions = await subscriptionService.getSubscriptionsByUserId(userId);
    res.status(200).json(subscriptions);
  } catch (error) {
    next(error);
  }
};

/**
 * Get subscriptions with route and stop details for the current user
 */
export const getUserSubscriptionsWithDetails = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const subscriptions = await subscriptionService.getSubscriptionsWithDetails(userId);
    res.status(200).json(subscriptions);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific subscription by ID
 */
export const getSubscriptionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subscription = await subscriptionService.getSubscriptionById(id);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Ensure user can only access their own subscriptions
    if (subscription.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized access to subscription' });
    }
    
    res.status(200).json(subscription);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a subscription
 */
export const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    // First check if subscription exists and belongs to user
    const existingSubscription = await subscriptionService.getSubscriptionById(id);
    
    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    if (existingSubscription.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to subscription' });
    }
    
    // If route_id is being updated, validate it exists
    if (req.body.route_id && req.body.route_id !== existingSubscription.route_id) {
      const routeExists = await subscriptionService.validateRouteExists(req.body.route_id);
      if (!routeExists) {
        return res.status(404).json({ error: 'Route not found' });
      }
    }
    
    // If stop_id is being updated, validate it exists
    if (req.body.stop_id && req.body.stop_id !== existingSubscription.stop_id) {
      const stopExists = await subscriptionService.validateStopExists(req.body.stop_id);
      if (!stopExists) {
        return res.status(404).json({ error: 'Stop not found' });
      }
    }
    
    const updatedSubscription = await subscriptionService.updateSubscription(id, req.body);
    res.status(200).json(updatedSubscription);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a subscription
 */
export const deleteSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    // First check if subscription exists and belongs to user
    const existingSubscription = await subscriptionService.getSubscriptionById(id);
    
    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    if (existingSubscription.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to subscription' });
    }
    
    await subscriptionService.deleteSubscription(id);
    res.status(200).json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export default {
  createSubscription,
  getUserSubscriptions,
  getUserSubscriptionsWithDetails, // Renamed from getUserSubscriptionsWithRouteDetails
  getSubscriptionById,
  updateSubscription,
  deleteSubscription
};