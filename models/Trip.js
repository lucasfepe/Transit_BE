import mongoose from 'mongoose';
import { getDatabase } from "../db.js";


// Schema
const tripSchema = new mongoose.Schema({
  route_short_name: Number,
  trip_id: Number,
});
const COLLECTION_NAME = "Trip2";
tripSchema.index({ trip_id: 1 });

const getTripModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, tripSchema, COLLECTION_NAME)
  );
};

// Functions to expose to the outside world!
export async function createTrip(trip) {
  const Trip = getTripModel();
  const newTrip = await Trip.create(trip);
  return newTrip;
}

export async function findAllTrips() {
  const Trip = getTripModel();
  const trips = await Trip.find();
  return trips;
}

export async function findTripById(id) {
    const Trip = getTripModel();

  const trip = await Trip.findById(id);
  return trip;
}

export async function findTripByTripId(trip_id) {
    const Trip = getTripModel();

  const trip = await Trip.findOne({
    trip_id: trip_id,
  });
  return trip;
}
