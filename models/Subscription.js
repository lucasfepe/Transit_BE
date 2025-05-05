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
    default: () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Edmonton',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const calgaryTimeStr = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}T${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`;
      return new Date(calgaryTimeStr);
    }
  },
  updatedAt: {
    type: Date,
    default: () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Edmonton',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const calgaryTimeStr = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}T${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`;
      return new Date(calgaryTimeStr);
    }
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

// Update the updatedAt field on save to Calgary time
subscriptionSchema.pre('save', function(next) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Edmonton',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const calgaryTimeStr = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}T${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`;
  this.updatedAt = new Date(calgaryTimeStr);
  next();
});

// Helper method to check if the subscription is active at the current time, using Calgary timezone
subscriptionSchema.methods.isActiveAtTime = function(currentTime) {
  // Don't notify if subscription is not active
  if (!this.active) {
    return false;
  }
  
  // Check if current time is within any of the subscription time windows
  if (this.times && this.times.length > 0) {
    // Convert currentTime to Calgary timezone for comparison
    const nowFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Edmonton',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const nowParts = nowFormatter.formatToParts(new Date(currentTime));
    const now = new Date(`${nowParts.find(p => p.type === 'year').value}-${nowParts.find(p => p.type === 'month').value}-${nowParts.find(p => p.type === 'day').value}T${nowParts.find(p => p.type === 'hour').value}:${nowParts.find(p => p.type === 'minute').value}:${nowParts.find(p => p.type === 'second').value}`);
    const currentDay = now.getDay(); // 0-6, Sunday-Saturday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if current day and time match any subscription time
    const isTimeMatch = this.times.some(timeWindow => {
      // Check if current day is in weekdays
      if (!timeWindow.weekdays.includes(currentDay)) {
        return false;
      }
      
      // Convert startTime and endTime to Calgary timezone for comparison
      const startFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Edmonton',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const startParts = startFormatter.formatToParts(timeWindow.startTime);
      const endParts = startFormatter.formatToParts(timeWindow.endTime);
      
      // Get hours and minutes from startTime and endTime in Calgary time
      const startHour = parseInt(startParts.find(p => p.type === 'hour').value, 10);
      const startMinute = parseInt(startParts.find(p => p.type === 'minute').value, 10);
      const endHour = parseInt(endParts.find(p => p.type === 'hour').value, 10);
      const endMinute = parseInt(endParts.find(p => p.type === 'minute').value, 10);
      
      // Convert current time, start time, and end time to minutes for easy comparison
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;
      
      // Check if current time is within the time window
      return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
    });
    
    return isTimeMatch;
  }
  
  // If no time windows specified, consider active at any time
  return true;
};

export const getSubscriptionModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, subscriptionSchema, COLLECTION_NAME)
  );
};