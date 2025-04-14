import { getStopOrderModel } from "../models/StopOrder.js";

export async function createStopOrder(stopOrder) {
    const StopOrder = getStopOrderModel();
    const newStopOrder = await StopOrder.create(stopOrder);
    return newStopOrder;
}

export async function findAllStopOrders() {
    const StopOrder = getStopOrderModel();
    const stopOrders = await StopOrder.find();
    return stopOrders;
}

export async function findStopOrderById(id) {
    const StopOrder = getStopOrderModel();
    const stopOrder = await StopOrder.findById(id);
    return stopOrder;
}

export async function findStopOrderByTripIdAndStopId(trip_id, stop_id) {
    const StopOrder = getStopOrderModel();
    const stopOrder = await StopOrder.findOne({
        trip_id: trip_id,
        stop_id: stop_id
    });
    return stopOrder;
}

export async function batchUpsertStopOrders(stopOrders) {
    const StopOrder = getStopOrderModel();
    
    const bulkOps = stopOrders.map(order => ({
        updateOne: {
            filter: { trip_id: order.trip_id, stop_id: order.stop_id },
            update: { $set: order },
            upsert: true
        }
    }));
    
    return await StopOrder.bulkWrite(bulkOps, { ordered: false });
}