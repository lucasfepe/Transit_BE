import mongoose from 'mongoose';
import { getDatabase } from "../db.js";


// Schema
const tripSchema = new mongoose.Schema({
  route_id: Number,
  trip_id: Number,
});
const COLLECTION_NAME = "Trip2";
tripSchema.index({ trip_id: 1 });

export const getTripModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, tripSchema, COLLECTION_NAME)
  );
};

// Functions to expose to the outside world!

