import notificationService from '../services/notification/index.js';

// Create a controller object with methods
const notificationsController = {
    testNotification: async (req, res) => {
        try {
            console.log('Received test notification request:', req.body);
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Token is required' 
                });
            }

            // Send a test notification to the specific token
            const success = await notificationService.sendTestNotification(
                token,
                'Test Notification', 
                'This is a test notification for your device'
            );

            if (success) {
                res.json({ 
                    success: true, 
                    message: 'Test notification sent successfully' 
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to send test notification' 
                });
            }
        } catch (error) {
            console.error('Error sending test notification:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }
    }
};

export default notificationsController;