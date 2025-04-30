// routes/user.routes.js
import express from 'express';
import {
    getUserProfile,
    updateUserProfile,
    getUsers,
    addPushToken,
    removePushToken,
    toggleNotifications,
    getNotificationSettings,
    updateNotificationSettings
} from '../controllers/user.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// User profile routes (for authenticated users)
router.get('/profile', isAuthenticated, getUserProfile);
router.put('/profile', isAuthenticated, updateUserProfile);
// Add this to your existing routes
router.delete('/delete-account', isAuthenticated, deleteUserAccount);

// Push notification endpoints
router.post('/push-token', isAuthenticated, addPushToken);
router.delete('/push-token', isAuthenticated, removePushToken);
router.put('/notifications/toggle', isAuthenticated, toggleNotifications);
router.get('/notifications/settings', isAuthenticated, getNotificationSettings);
router.put('/notifications/settings', isAuthenticated, updateNotificationSettings);

// Admin routes
router.get('/', isAdmin, getUsers);

export default router;