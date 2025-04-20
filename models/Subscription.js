// models/Subscription.js
import mongoose from 'mongoose';
import { getDatabase } from "../db.js";

// Schema
const subscriptionSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  route_id: { 
    type: String,  // Changed to String to match route_short_name
    required: true
  },
  stop_id: { 
    type: String,  // Assuming this is also a string identifier
    required: true
  },
  times: {
    type: [
      {
        weekdays: {
          type: [Number],
          required: true,
          validate: {
            validator: function(arr) {
              // Validate weekdays are between 0-6 (Sunday-Saturday)
              return arr.every(day => day >= 0 && day <= 6);
            },
            message: 'Weekdays must be between 0 and 6'
          }
        },
        startTime: {
          type: Date,
          required: true
        },
        endTime: {
          type: Date,
          required: true
        }
      }
    ],
    default: []
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // New fields for push notifications
  notificationDistance: {
    type: Number,
    default: 500 // Distance in meters to trigger notification
  },
  lastNotifiedVehicleId: {
    type: String,
    default: null
  },
  lastNotifiedAt: {
    type: Date,
    default: null
  },
  notificationCount: {
    type: Number,
    default: 0
  },
  notificationSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    minTimeBetweenNotifications: {
      type: Number,
      default: 10 // Minimum time between notifications in minutes
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    vibrationEnabled: {
      type: Boolean,
      default: true
    }
  }
});

const COLLECTION_NAME = "Subscriptions";
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ route_id: 1 });
subscriptionSchema.index({ stop_id: 1 });
// Compound index for common query patterns
subscriptionSchema.index({ userId: 1, route_id: 1, stop_id: 1 });
// Index for notification queries
subscriptionSchema.index({ 
  active: 1, 
  lastNotifiedAt: 1, 
  lastNotifiedVehicleId: 1 
});

// Update the updatedAt field on save
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Helper method to check if a notification should be sent
subscriptionSchema.methods.shouldNotify = function(currentTime, vehicleId) {
  // Don't notify if subscription is not active
  if (!this.active || !this.notificationSettings.enabled) {
    return false;
  }
  
  // Check if we've already notified for this vehicle
  if (this.lastNotifiedVehicleId === vehicleId) {
    return false;
  }
  
  // Check if minimum time between notifications has passed
  if (this.lastNotifiedAt) {
    const minTimeBetween = this.notificationSettings.minTimeBetweenNotifications || 10; // Default 10 minutes
    const minTimeMs = minTimeBetween * 60 * 1000;
    const timeSinceLastNotification = currentTime - this.lastNotifiedAt.getTime();
    
    if (timeSinceLastNotification < minTimeMs) {
      return false;
    }
  }
  
  // Check if current time is within any of the subscription time windows
  if (this.times && this.times.length > 0) {
    const now = new Date(currentTime);
    const currentDay = now.getDay(); // 0-6, Sunday-Saturday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if current day and time match any subscription time
    const isTimeMatch = this.times.some(timeWindow => {
      // Check if current day is in weekdays
      if (!timeWindow.weekdays.includes(currentDay)) {
        return false;
      }
      
      // Get hours and minutes from startTime and endTime
      const startHour = timeWindow.startTime.getHours();
      const startMinute = timeWindow.startTime.getMinutes();
      const endHour = timeWindow.endTime.getHours();
      const endMinute = timeWindow.endTime.getMinutes();
      
      // Convert current time, start time, and end time to minutes for easy comparison
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;
      
      // Check if current time is within the time window
      return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
    });
    
    return isTimeMatch;
  }
  
  // If no time windows specified, allow notification at any time
  return true;
};

export const getSubscriptionModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, subscriptionSchema, COLLECTION_NAME)
  );
};