// routes/subscription.routes.js
import { Router } from 'express';
import subscriptionController from '../controllers/subscription.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { subscription as validateSubscription } from '../middleware/validate.middleware.js';

const router = Router();

// All subscription routes require authentication
router.use(isAuthenticated);

// Get all subscriptions for the current user
router.get('/', subscriptionController.getUserSubscriptions);

// Get subscriptions with route details
router.get('/with-details', subscriptionController.getUserSubscriptionsWithDetails);

// Get a specific subscription
router.get('/:id', subscriptionController.getSubscriptionById);

// Create a new subscription
router.post('/', validateSubscription, subscriptionController.createSubscription);

// Update a subscription
router.put('/:id', validateSubscription, subscriptionController.updateSubscription);

// Delete a subscription
router.delete('/:id', subscriptionController.deleteSubscription);

export default router;