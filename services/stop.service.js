import { getStopModel } from "../models/Stop.js";

export async function createStop(stop) {
    const Stop = getStopModel();
    const newStop = await Stop.create(stop);
    return newStop;
}

export async function findAllStops() {
    const Stop = getStopModel();
    const stops = await Stop.find();
    return stops;
}

export async function findStopById(id) {
    const Stop = getStopModel();
    const stop = await Stop.findById(id);
    return stop;
}

export async function findStopByStopId(stop_id) {
    const Stop = getStopModel();
    const stop = await Stop.findOne({ stop_id });
    return stop;
}

export async function batchUpsertStops(stops) {
    const Stop = getStopModel();
    
    const bulkOps = stops.map(stop => ({
        updateOne: {
            filter: { stop_id: stop.stop_id },
            update: { 
                $set: {
                    ...stop,
                    stop_lat: Number(stop.stop_lat),
                    stop_lon: Number(stop.stop_lon)
                }
            },
            upsert: true
        }
    }));
    
    return await Stop.bulkWrite(bulkOps, { ordered: false });
}