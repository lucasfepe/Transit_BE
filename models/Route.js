import mongoose from 'mongoose';
import { getDatabase } from "../db.js";

// Schema
const transitRoutesSchema = new mongoose.Schema({
  route_short_name: String,
  route_category: String,
  route_long_name: String,
  multilinestring: {
    type: {
      type: String,
      enum: ["MultiLineString"],
      required: true
    },
    coordinates: {
      type: [[[Number]]],
      required: true
    }
  }
});
const COLLECTION_NAME = "Route2";
transitRoutesSchema.index({ multilinestring: "2dsphere" });
transitRoutesSchema.index({ route_short_name: 1 });

export const getRouteModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, transitRoutesSchema, COLLECTION_NAME)
  );
};


