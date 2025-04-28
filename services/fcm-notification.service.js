// services/fcm-notification.service.js
import admin from '../firebaseAdmin.js';

class FCMNotificationService {
    async sendNotification(token, title, body, data = {}) {
        try {
            if (!token) {
                console.error('No token provided for notification');
                return false;
            }

            // Check if this is an Expo token
            const isExpoToken = token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');

            // If it's an Expo token, we need to handle it differently
            if (isExpoToken) {
                console.log('Expo token detected, using Expo push service');
                // Use your existing Expo push service
                return this.sendExpoNotification(token, title, body, data);
            }

            // For FCM tokens, use direct Firebase Admin SDK
            const message = {
                token,
                notification: {
                    title,
                    body,
                },
                data: {
                    ...data,
                    // Convert all values to strings as required by FCM
                    ...Object.entries(data).reduce((acc, [key, value]) => {
                        acc[key] = String(value);
                        return acc;
                    }, {})
                },
                android: {
                    priority: 'high',
                    notification: {
                        sound: data.sound !== false ? 'default' : undefined,
                        channelId: 'transit-alerts'
                    }
                }
            };

            const response = await admin.messaging().send(message);
            console.log('Successfully sent FCM message:', response);
            return true;
        } catch (error) {
            console.error('Error sending FCM message:', error);
            return false;
        }
    }

    // Use your existing Expo notification service
    async sendExpoNotification(token, title, body, data = {}) {
        // Your existing Expo push notification code
        // ...
    }

    // Method to send to multiple tokens
    async sendMulticast(tokens, title, body, data = {}) {
        if (!tokens || tokens.length === 0) {
            console.error('No tokens provided for multicast');
            return false;
        }

        try {
            // Group tokens by type (Expo vs FCM)
            const expoTokens = tokens.filter(token =>
                token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
            );

            const fcmTokens = tokens.filter(token =>
                !token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')
            );

            const results = [];

            // Send to FCM tokens in batches of 500 (FCM limit)
            if (fcmTokens.length > 0) {
                // Format data for FCM (all values must be strings)
                const fcmData = {
                    ...data,
                    ...Object.entries(data).reduce((acc, [key, value]) => {
                        acc[key] = String(value);
                        return acc;
                    }, {})
                };

                // Create message
                const message = {
                    notification: {
                        title,
                        body,
                    },
                    data: fcmData,
                    android: {
                        priority: 'high',
                        notification: {
                            sound: data.sound !== false ? 'default' : undefined,
                            channelId: 'transit-alerts'
                        }
                    },
                    tokens: fcmTokens.slice(0, 500) // FCM limit is 500 per request
                };

                const response = await admin.messaging().sendMulticast(message);
                results.push(response);
            }

            // Send to Expo tokens using your existing service
            if (expoTokens.length > 0) {
                // Your code to send to Expo tokens
                // ...
            }

            return true;
        } catch (error) {
            console.error('Error sending multicast:', error);
            return false;
        }
    }
}

export default new FCMNotificationService();