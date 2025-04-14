import mongoose from 'mongoose';
import { getDatabase } from "../db.js";

// Schema
const stopOrderSchema = new mongoose.Schema({
  trip_id: Number,
  stop_id: Number,
  stop_sequence: Number
});
const COLLECTION_NAME = "StopOrder2";
stopOrderSchema.index({ trip_id: 1 });

export const getStopOrderModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, stopOrderSchema, COLLECTION_NAME)
  );
};

// Functions to expose to the outside world!
