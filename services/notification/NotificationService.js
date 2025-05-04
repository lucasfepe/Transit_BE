// services/notification/NotificationService.js
import VehicleLocationProcessor from './processors/VehicleLocationProcessor.js';
import QueueProcessor from './processors/QueueProcessor.js';
import TokenManager from './utils/TokenManager.js';
import testExpoConnection from './config.js';

// Test Expo connection at startup
testExpoConnection();

class NotificationService {
  constructor() {
    this.vehicleProcessor = new VehicleLocationProcessor();
    this.queueProcessor = new QueueProcessor();
    this.tokenManager = new TokenManager();
  }

  async processVehicleLocations(vehicles) {
    return this.vehicleProcessor.process(vehicles);
  }

  async sendTestNotification(token, title = 'Test Notification', body = 'This is a test notification') {
    if (!token) {
      console.error('No token provided for test notification');
      return false;
    }

    const isExpo = this.tokenManager.isExpoToken(token);
    console.log(`Sending test notification to ${isExpo ? 'Expo' : 'FCM'} token: ${token}`);

    return isExpo 
      ? this.queueProcessor.sendExpoTestNotification(token, title, body)
      : this.queueProcessor.sendFCMTestNotification(token, title, body);
  }
}

export default NotificationService;