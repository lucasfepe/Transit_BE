import notificationService from '../services/notification.service.js';

// controllers/route.controller.js

// Create a controller object with methods
const notificationsController = {
    testNotification: async (req, res) => {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({ success: false, message: 'Token is required' });
            }

            // Use the sendTestNotification method which now supports both FCM and Expo tokens
            const success = await notificationService.sendTestNotification(token);

            if (success) {
                res.json({ success: true, message: 'Test notification sent successfully' });
            } else {
                res.status(500).json({ success: false, message: 'Failed to send test notification' });
            }
        } catch (error) {
            console.error('Error sending test notification:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};


// Export the controller object as default
export default notificationsController;