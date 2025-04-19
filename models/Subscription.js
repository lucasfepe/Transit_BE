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
  }
});

const COLLECTION_NAME = "Subscriptions";
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ route_id: 1 });
subscriptionSchema.index({ stop_id: 1 });
// Compound index for common query patterns
subscriptionSchema.index({ userId: 1, route_id: 1, stop_id: 1 });

// Update the updatedAt field on save
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const getSubscriptionModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, subscriptionSchema, COLLECTION_NAME)
  );
};