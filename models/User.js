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
  }
});

const COLLECTION_NAME = "Users";
userSchema.index({ email: 1 });

export const getUserModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, userSchema, COLLECTION_NAME)
  );
};