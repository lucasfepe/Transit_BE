import { getTripModel } from "../models/Trip.js";

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