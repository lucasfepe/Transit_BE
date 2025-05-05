// models/Subscription.js
import mongoose from 'mongoose';
import { getDatabase } from "../db.js";

// Helper function to safely format a date in Calgary timezone
function formatInCalgaryTimezone(date) {
  if (!date) return null;
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Edmonton',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return formatter.format(new Date(date));
  } catch (error) {
    console.error("Error formatting date in Calgary timezone:", error);
    return null;
  }
}

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
  // Fields for tracking notification history
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

// Helper method to check if the subscription is active at the current time
subscriptionSchema.methods.isActiveAtTime = function(currentTime) {
  console.log("Checking if subscription is active at time:", currentTime);
  try {
    // Don't notify if subscription is not active
    if (!this.active) {
      return false;
    }
    
    // Check if current time is within any of the subscription time windows
    if (this.times && this.times.length > 0) {
      // Get current time in Calgary timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Edmonton',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
        hour12: false
      });
      
      // Format parts for current time
      let now;
      try {
        now = new Date(currentTime);
      } catch (error) {
        console.error("Error parsing currentTime:", error);
        now = new Date(); // Fallback to current time if invalid
      }
      
      const calgaryTimeParts = formatter.formatToParts(now);
      
      // Get day of week in Calgary time (0-6)
      const dayNameMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
      const dayNamePart = calgaryTimeParts.find(part => part.type === 'weekday');
      const currentDay = dayNameMap[dayNamePart.value];
      
      // Get hour and minute in Calgary time
      const hourPart = calgaryTimeParts.find(part => part.type === 'hour');
      const minutePart = calgaryTimeParts.find(part => part.type === 'minute');
      const currentHour = parseInt(hourPart.value, 10);
      const currentMinute = parseInt(minutePart.value, 10);
      
      // Current time in minutes (for comparison)
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      // Check if current day and time match any subscription time
      const isTimeMatch = this.times.some(timeWindow => {
        // Check if current day is in weekdays
        if (!timeWindow.weekdays.includes(currentDay)) {
          return false;
        }
        
        // Get hours and minutes from startTime and endTime in Calgary timezone
        // Using a try-catch because date operations can sometimes fail with invalid dates
        try {
          // Format startTime in Calgary timezone
          const startFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Edmonton',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          
          // Format endTime in Calgary timezone
          const endFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Edmonton',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          
          // Parse hours and minutes
          const startParts = startFormatter.formatToParts(timeWindow.startTime);
          const endParts = endFormatter.formatToParts(timeWindow.endTime);
          
          const startHour = parseInt(startParts.find(part => part.type === 'hour').value, 10);
          const startMinute = parseInt(startParts.find(part => part.type === 'minute').value, 10);
          const endHour = parseInt(endParts.find(part => part.type === 'hour').value, 10);
          const endMinute = parseInt(endParts.find(part => part.type === 'minute').value, 10);
          
          // Convert to minutes for comparison
          const startTimeInMinutes = startHour * 60 + startMinute;
          const endTimeInMinutes = endHour * 60 + endMinute;
          
          // Check if current time is within the time window
          return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
        } catch (error) {
          console.error("Error processing time window:", error, {
            startTime: timeWindow.startTime,
            endTime: timeWindow.endTime
          });
          return false; // Skip invalid time windows
        }
      });
      
      return isTimeMatch;
    }
    
    // If no time windows specified, consider active at any time
    return true;
  } catch (error) {
    console.error("Error in isActiveAtTime method:", error);
    return false; // Default to not active if there's an error
  }
};

// Static method to create subscription with Calgary timezone
subscriptionSchema.statics.createWithCalgaryTime = async function(subscriptionData) {
  try {
    // If there are times with startTime/endTime as strings, convert them to Date objects
    if (subscriptionData.times && subscriptionData.times.length > 0) {
      subscriptionData.times = subscriptionData.times.map(timeWindow => {
        const newTimeWindow = { ...timeWindow };
        
        // Convert startTime string to Date if it's a string
        if (typeof timeWindow.startTime === 'string') {
          // Assume the string is in format "HH:MM" in Calgary time
          const [hours, minutes] = timeWindow.startTime.split(':').map(num => parseInt(num, 10));
          // Create a Date object with the time components
          const startDate = new Date();
          startDate.setHours(hours, minutes, 0, 0);
          newTimeWindow.startTime = startDate;
        }
        
        // Convert endTime string to Date if it's a string
        if (typeof timeWindow.endTime === 'string') {
          // Assume the string is in format "HH:MM" in Calgary time
          const [hours, minutes] = timeWindow.endTime.split(':').map(num => parseInt(num, 10));
          // Create a Date object with the time components
          const endDate = new Date();
          endDate.setHours(hours, minutes, 0, 0);
          newTimeWindow.endTime = endDate;
        }
        
        return newTimeWindow;
      });
    }
    
    // Create the subscription
    return await this.create(subscriptionData);
  } catch (error) {
    console.error("Error creating subscription with Calgary time:", error);
    throw error;
  }
};

export const getSubscriptionModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, subscriptionSchema, COLLECTION_NAME)
  );
};