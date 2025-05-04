import cacheService from "../services/cache.service.js";
import { getUserModel } from '../models/User.js';
import admin from '../firebaseAdmin.js';
import notificationService from '../services/notification/index.js';

class AdminController {
    async clearCache(req, res, next) {
        try {
            cacheService.clearCache();
            res.json({ success: true, message: 'Cache cleared successfully' });
        } catch (error) {
            console.error('Error clearing cache:', error);
            res.status(500).json({ success: false, message: 'Failed to clear cache' });
        }
    }

    async clearAllPushTokens(req, res, next) {
        try {
            // Step 1: Clear all push tokens from users in MongoDB
            const User = getUserModel();
            const updateResult = await User.updateMany(
                {}, 
                { $set: { pushTokens: [] } }
            );
            
            // Step 2: Revoke all Firebase sessions (log everyone out)
            const firebaseUsers = await admin.auth().listUsers();
            const revokePromises = firebaseUsers.users.map(user => 
                admin.auth().revokeRefreshTokens(user.uid)
            );
            
            await Promise.all(revokePromises);
            
            res.json({ 
                success: true,
                message: 'All push tokens deleted and users logged out successfully',
                usersAffected: updateResult.modifiedCount,
                firebaseSessionsRevoked: firebaseUsers.users.length
            });
        } catch (error) {
            console.error('Error clearing push tokens:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to clear push tokens and logout users',
                error: error.message 
            });
        }
    }

    async broadcastNotification(req, res, next) {
        try {
            // Get all users with valid push tokens
            const User = getUserModel();
            const users = await User.find({ 
                "pushTokens.0": { $exists: true },
                notificationsEnabled: true 
            });
            
            if (!users || users.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'No users with valid push tokens found' 
                });
            }
            
            // Extract all unique tokens
            const tokens = [];
            users.forEach(user => {
                user.pushTokens.forEach(pushToken => {
                    if (pushToken.token) {
                        tokens.push(pushToken.token);
                    }
                });
            });
            
            // Send notification to all tokens
            let successCount = 0;
            for (const token of tokens) {
                const result = await notificationService.sendTestNotification(
                    token, 
                    'System Broadcast', 
                    'This is a system-wide test notification from the admin panel'
                );
                if (result) successCount++;
            }
            
            res.json({ 
                success: true, 
                message: `Broadcast notification sent successfully`, 
                sentCount: successCount,
                totalTokens: tokens.length,
            });
        } catch (error) {
            console.error('Error broadcasting notification:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error broadcasting notification',
                error: error.message 
            });
        }
    }
}

const adminController = new AdminController();
export default adminController;