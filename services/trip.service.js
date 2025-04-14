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
    const trip = await Trip.findOne({ trip_id });
    return trip;
}

export async function batchUpsertTrips(trips) {
    const Trip = getTripModel();
    
    const bulkOps = trips.map(trip => ({
        updateOne: {
            filter: { trip_id: trip.trip_id },
            update: { 
                $set: {
                    route_id: Number(trip.route_id.split("-")[0]),
                    trip_id: trip.trip_id
                }
            },
            upsert: true
        }
    }));
    
    return await Trip.bulkWrite(bulkOps, { ordered: false });
}