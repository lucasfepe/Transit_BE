// services/notification/config.js
import { Expo } from "expo-server-sdk";

// Log environment information
console.log(`Running in ${process.env.NODE_ENV || 'development'} environment`);

// Test Expo connection at startup
async function testExpoConnection() {
  try {
    const expo = new Expo();
    console.log("Testing Expo connection...");
    // Simple test to see if we can create a valid message
    const message = {
      to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]", // Dummy token for testing
      body: "Test message",
      data: { test: true },
    };

    // This will throw an error if there's a connection issue
    expo.chunkPushNotifications([message]);
    console.log("Expo connection test successful");
  } catch (error) {
    console.error("Expo connection test failed:", error);
  }
}

export default testExpoConnection;