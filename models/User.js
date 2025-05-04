// models/User.js
import mongoose from 'mongoose';
import { getDatabase } from "../db.js";

// Schema
const userSchema = new mongoose.Schema({
  firebaseUid: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  displayName: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: { 
    type: Date 
  },
  // Add push notification fields
  pushTokens: [{
    token: {
      type: String,
      required: true
    },
    deviceId: {
      type: String
    },
    deviceName: {
      type: String
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  notificationSettings: {
    distance: {
      type: Number,
      default: 1000 // Default notification distance in meters
    },
    minTimeBetweenNotifications: {
      type: Number,
      default: 10 // Default minimum time between notifications in minutes
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

const COLLECTION_NAME = "Users";
userSchema.index({ email: 1 });
// Add index for push tokens for faster queries
userSchema.index({ 'pushTokens.token': 1 });

export const getUserModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, userSchema, COLLECTION_NAME)
  );
};