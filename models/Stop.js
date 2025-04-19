import mongoose from 'mongoose';
import { getDatabase } from "../db.js";

// Schema
const stopSchema = new mongoose.Schema({
  stop_id: Number,
  stop_lat: Number,
  stop_lon: Number,
  stop_name: String
});
const COLLECTION_NAME = "Stop2";
stopSchema.index({ stop_id: 1 });

export const getStopModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, stopSchema, COLLECTION_NAME)
  );
};

