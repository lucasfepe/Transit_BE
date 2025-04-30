// controllers/user.controller.js
import { getUserByFirebaseUid, updateUser, getAllUsers, deleteUser } from '../services/user.service.js';
import { getUserModel } from '../models/User.js';
import { getSubscriptionModel } from '../models/Subscription.js';
/**
 * Get the current user's profile
 */
export const getUserProfile = async (req, res, next) => {
    try {
        // We can use req.mongoUser which was attached in the middleware
        // or fetch it again if needed
        const user = req.mongoUser || await getUserByFirebaseUid(req.user.uid);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete user account and all associated data
 */
export const deleteUserAccount = async (req, res, next) => {
    try {
        console.log("deleting account");
        const userId = req.user.uid;

        // 1. Delete all user's subscriptions
        const Subscription = getSubscriptionModel();
        await Subscription.deleteMany({ userId });
        console.log("deleted subscriptions");
        // 2. Delete the user from MongoDB
        const result = await deleteUser(userId);
        console.log("deleted user");
        if (!result) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 3. Return success response
        res.status(200).json({
            message: 'Account and all associated data deleted successfully',
            success: true
        });

        // Note: The Firebase account itself will be deleted from the client side
    } catch (error) {
        next(error);
    }
};

/**
 * Update the current user's profile
 */
export const updateUserProfile = async (req, res, next) => {
    try {
        const { displayName, photoURL } = req.body;

        const updatedUser = await updateUser(req.user.uid, {
            displayName,
            photoURL,
            updatedAt: new Date()
        });

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
};

/**
 * Admin function to get all users
 */
export const getUsers = async (req, res, next) => {
    try {
        const users = await getAllUsers();
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
};

/**
 * Add push token to user
 */
export const addPushToken = async (req, res, next) => {
    try {
        const { pushToken } = req.body;
        const userId = req.user.uid;

        if (!pushToken) {
            return res.status(400).json({ error: 'Push token is required' });
        }

        const User = getUserModel();

        // Find user
        const user = await User.findOne({ firebaseUid: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Initialize pushTokens array if it doesn't exist
        if (!user.pushTokens) {
            user.pushTokens = [];
        }

        // Check if token already exists
        const tokenExists = user.pushTokens.some(t => t.token === pushToken);

        if (!tokenExists) {
            // Add new token
            user.pushTokens.push({
                token: pushToken,
                createdAt: new Date()
            });
            await user.save();
        }

        res.status(200).json({
            message: 'Push token added successfully',
            success: true
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove push token from user
 */
export const removePushToken = async (req, res, next) => {
    try {
        const { pushToken } = req.body;
        const userId = req.user.uid;

        if (!pushToken) {
            return res.status(400).json({ error: 'Push token is required' });
        }

        const User = getUserModel();

        // Find and update user
        const result = await User.updateOne(
            { firebaseUid: userId },
            { $pull: { pushTokens: { token: pushToken } } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            message: 'Push token removed successfully',
            success: true
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle notifications
 */
export const toggleNotifications = async (req, res, next) => {
    try {
        const { enabled } = req.body;
        const userId = req.user.uid;

        if (enabled === undefined) {
            return res.status(400).json({ error: 'Enabled status is required' });
        }

        const User = getUserModel();

        // Update user notification preferences
        const result = await User.updateOne(
            { firebaseUid: userId },
            { $set: { notificationsEnabled: enabled } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            message: `Notifications ${enabled ? 'enabled' : 'disabled'} successfully`,
            success: true
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get notification settings
 */
export const getNotificationSettings = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const User = getUserModel();

        const user = await User.findOne({ firebaseUid: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Format the response to match the frontend expectations
        const settings = {
            enabled: user.notificationsEnabled || false,
            soundEnabled: user.notificationSettings?.soundEnabled !== false, // Default to true if not set
            vibrationEnabled: user.notificationSettings?.vibrationEnabled !== false, // Default to true if not set
            minTimeBetweenNotifications: user.notificationSettings?.minTimeBetweenNotifications || 10,
            distance: user.notificationSettings?.distance || 1000
        };

        // Return notification settings
        res.status(200).json(settings);
    } catch (error) {
        next(error);
    }
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (req, res, next) => {
    try {
        const {
            distance,
            minTimeBetweenNotifications,
            soundEnabled,
            vibrationEnabled
        } = req.body;

        const userId = req.user.uid;

        const updateData = {};

        // Only update fields that are provided
        if (distance !== undefined && !isNaN(distance)) {
            updateData['notificationSettings.distance'] = Number(distance);
        }

        if (minTimeBetweenNotifications !== undefined && !isNaN(minTimeBetweenNotifications)) {
            updateData['notificationSettings.minTimeBetweenNotifications'] = Number(minTimeBetweenNotifications);
        }

        if (soundEnabled !== undefined) {
            updateData['notificationSettings.soundEnabled'] = Boolean(soundEnabled);
        }

        if (vibrationEnabled !== undefined) {
            updateData['notificationSettings.vibrationEnabled'] = Boolean(vibrationEnabled);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No valid settings provided' });
        }

        const User = getUserModel();

        // Ensure notificationSettings object exists before updating
        await User.updateOne(
            {
                firebaseUid: userId,
                notificationSettings: { $exists: false }
            },
            {
                $set: {
                    notificationSettings: {
                        distance: 1000,
                        minTimeBetweenNotifications: 10,
                        soundEnabled: true,
                        vibrationEnabled: true
                    }
                }
            }
        );

        // Update user notification settings
        const result = await User.updateOne(
            { firebaseUid: userId },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            message: 'Notification settings updated successfully',
            success: true
        });
    } catch (error) {
        next(error);
    }
};