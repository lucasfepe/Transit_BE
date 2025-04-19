// Create a controller object with methods
import { getTripModel } from '../models/Trip.js';
import { getStopOrderModel } from '../models/StopOrder.js';
import { getStopModel } from '../models/Stop.js';
import cacheService from '../services/cache.service.js';

// Add a new cache property to the cacheService for route stops
if (!cacheService.routeStopsCache) {
    cacheService.routeStopsCache = {};
}

const stopController = {
    getStopsByRouteId: async(req, res, next) => {
        try {
            const { routeId } = req.params;
            
            if (!routeId) {
                return res.status(400).json({ 
                    message: 'Route ID is required' 
                });
            }
            
            console.log("Getting stops for route:", routeId);
            
            // Check cache first
            const cachedData = cacheService.routeStopsCache[routeId];
            
            if (cachedData && (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000)) {
                console.log(`Cache hit for route stops: ${routeId}`);
                return res.json(cachedData.data);
            }
            
            console.log(`Cache miss for route stops: ${routeId}, fetching from database`);
            
            // Import required models
            const Trip = getTripModel();
            const StopOrder = getStopOrderModel();
            const Stop = getStopModel();
            
            // First, find all trips associated with this route
            const trips = await Trip.find({ route_id: routeId });
            
            if (!trips || trips.length === 0) {
                return res.status(404).json({ 
                    message: 'No trips found for this route' 
                });
            }
            
            // Extract trip IDs
            const tripIds = trips.map(trip => trip.trip_id);
            
            // Find all stop orders for these trips
            const stopOrders = await StopOrder.find({ trip_id: { $in: tripIds } });
            
            // Extract unique stop IDs
            const stopIds = [...new Set(stopOrders.map(order => order.stop_id))];
            
            // Get all stops information
            const stops = await Stop.find({ stop_id: { $in: stopIds } });
            
            // Create a map of stop_id to stop data
            const stopsMap = stops.reduce((acc, stop) => {
                acc[stop.stop_id] = {
                    stop_id: stop.stop_id,
                    stop_name: stop.stop_name,
                    stop_lat: stop.stop_lat,
                    stop_lon: stop.stop_lon
                };
                return acc;
            }, {});
            
            // Group stop orders by trip_id
            const stopsByTrip = stopOrders.reduce((acc, order) => {
                if (!acc[order.trip_id]) {
                    acc[order.trip_id] = [];
                }
                
                // Only add if we have the stop information
                if (stopsMap[order.stop_id]) {
                    acc[order.trip_id].push({
                        ...stopsMap[order.stop_id],
                        stop_sequence: order.stop_sequence
                    });
                }
                
                return acc;
            }, {});
            
            // For each trip, sort stops by sequence
            Object.keys(stopsByTrip).forEach(tripId => {
                stopsByTrip[tripId].sort((a, b) => a.stop_sequence - b.stop_sequence);
            });
            
            // Prepare the result
            const result = {
                route_id: routeId,
                trips: stopsByTrip
            };
            
            // Cache the result with a timestamp
            cacheService.routeStopsCache[routeId] = {
                data: result,
                timestamp: Date.now()
            };
            
            // Return the result
            res.json(result);
            
        } catch (error) {
            console.error('Error finding stops for route:', error);
            res.status(500).json({ message: error.message });
        }
    }
};

// Export the controller object as default
export default stopController;