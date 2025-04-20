// services/tripMapping.service.js
import cacheService from './cache.service.js';
import { getTripModel } from '../models/Trip.js';
import { getRouteModel } from '../models/Route.js';
import { getStopOrderModel } from '../models/StopOrder.js';
import { getStopModel } from '../models/Stop.js';

class TripMappingService {
    // Lightweight method - only returns trip-to-route mappings
    async getLightMappingsForTrips(tripIds) {
        // First check cache
        const { cached, uncachedTripIds } = cacheService.getMultipleTripMappings(tripIds, true); // true = lightweight mode

        // If all trips were cached, return early
        if (uncachedTripIds.length === 0) {
            return cached;
        }

        // Get mappings from database for uncached trips
        const dbMappings = await this.fetchLightMappingsFromDb(uncachedTripIds);

        // Cache the new mappings
        Object.entries(dbMappings).forEach(([route_id, mapping]) => {
            cacheService.setTripMapping(route_id, mapping, true); // true = lightweight mode
        });

        // Merge cached and new mappings
        return { ...cached, ...dbMappings };
    }

    // Detailed method - returns route shapes and stops
    async getRouteDetails(routeId) {
        // Check cache first
        const cachedRoute = cacheService.getRouteDetails(routeId);
        if (cachedRoute) {
            return cachedRoute;
        }

        // Fetch from database if not cached
        const routeDetails = await this.fetchRouteDetailsFromDb(routeId);

        // Cache the result
        if (routeDetails) {
            cacheService.setRouteDetails(routeId, routeDetails);
        }

        return routeDetails;
    }

    // Fetch only trip-to-route mappings from database
    async fetchLightMappingsFromDb(tripIds) {
        const Trip = getTripModel();

        // Get all trips in a single query
        const trips = await Trip.find({
            trip_id: { $in: tripIds }
        });

        // Create a map of route_id to trip_ids
        const tripsByRoute = trips.reduce((acc, trip) => {
            if (!acc[trip.route_id]) {
                acc[trip.route_id] = {
                    trip_ids: []
                };
            }
            acc[trip.route_id].trip_ids.push(trip.trip_id);
            return acc;
        }, {});

        return tripsByRoute;
    }

    // Fetch detailed route information (shapes and stops)
    async fetchRouteDetailsFromDb(routeId) {
        const Route = getRouteModel();
        const Trip = getTripModel();
        const StopOrder = getStopOrderModel();
        const Stop = getStopModel();
    
        // Get the route
        const route = await Route.findOne({ route_short_name: routeId });
        if (!route) {
            return null;
        }
    
        // Get a trip for this route to find stops
        const trip = await Trip.findOne({ route_id: routeId });
        if (!trip) {
            // Return route with shape but no stops
            return {
                route_id: routeId,
                route_long_name: route.route_long_name, // Add route_long_name
                shape: route.multilinestring.coordinates,
                stops: []
            };
        }
    
        // Get stop orders for this trip
        const stopOrders = await StopOrder.find({ trip_id: trip.trip_id });
    
        // Extract all stop IDs
        const stopIds = stopOrders.map(order => order.stop_id);
    
        // Get all stops
        const stops = await Stop.find({ stop_id: { $in: stopIds } });
    
        // Create a map of stop_id to stop data
        const stopsMap = stops.reduce((acc, stop) => {
            acc[stop.stop_id] = {
                stop_id: stop.stop_id,
                stop_lat: stop.stop_lat,
                stop_lon: stop.stop_lon,
                stop_name: stop.stop_name 
            };
            return acc;
        }, {});
    
        // Combine stop data with sequence information
        const routeStops = stopOrders
            .filter(order => stopsMap[order.stop_id]) // Only include stops we have data for
            .map(order => ({
                ...stopsMap[order.stop_id],
                stop_sequence: order.stop_sequence
            }))
            .sort((a, b) => a.stop_sequence - b.stop_sequence); // Sort by sequence
    
        // Return complete route details
        return {
            route_id: routeId,
            route_long_name: route.route_long_name, // Add route_long_name
            shape: route.multilinestring.coordinates,
            stops: routeStops
        };
    }

    // Original method - kept for backward compatibility if needed
    async getMappingsForTrips(tripIds) {
        // First check cache
        const { cached, uncachedTripIds } = cacheService.getMultipleTripMappings(tripIds);

        // If all trips were cached, return early
        if (uncachedTripIds.length === 0) {
            return cached;
        }

        // Get mappings from database for uncached trips
        const dbMappings = await this.fetchMappingsFromDb(uncachedTripIds);

        // Cache the new mappings
        Object.entries(dbMappings).forEach(([route_id, mapping]) => {
            cacheService.setTripMapping(route_id, mapping);
        });

        // Merge cached and new mappings
        return { ...cached, ...dbMappings };
    }

    async fetchMappingsFromDb(tripIds) {
        const Trip = getTripModel();
        const Route = getRouteModel();
        const StopOrder = getStopOrderModel();
        const Stop = getStopModel();

        // Get all trips in a single query - O(n)
        const trips = await Trip.find({
            trip_id: { $in: tripIds }
        });

        // Create a map of route_id to trip_ids - O(n)
        const tripsByRoute = trips.reduce((acc, trip) => {
            if (!acc[trip.route_id]) {
                acc[trip.route_id] = {
                    trip_ids: []
                };
            }
            acc[trip.route_id].trip_ids.push(trip.trip_id);
            return acc;
        }, {});

        // Create a map of trip_id to route_id for quick lookup
        const tripToRouteMap = trips.reduce((acc, trip) => {
            acc[trip.trip_id] = trip.route_id;
            return acc;
        }, {});

        // Get all relevant routes in a single query - O(m) where m is number of unique routes
        const routes = await Route.find({
            route_short_name: {
                $in: Object.keys(tripsByRoute)
            }
        });

        // Add shape data to our mapping - O(m)
        routes.forEach(route => {
            if (tripsByRoute[Number(route.route_short_name)]) {
                tripsByRoute[Number(route.route_short_name)].shape = route.multilinestring.coordinates;
            }
        });

        // Get all stop orders for the first trip of each route
        const firstTripPerRoute = Object.values(tripsByRoute).map(route => route.trip_ids[0]);

        const stopOrders = await StopOrder.find({
            trip_id: { $in: firstTripPerRoute }
        });

        // Extract all unique stop_ids from stop orders
        const stopIds = [...new Set(stopOrders.map(order => order.stop_id))];

        // Get all stops information in a single query
        const stops = await Stop.find({
            stop_id: { $in: stopIds }
        });

        // Create a map of stop_id to stop data for quick lookup
        const stopsMap = stops.reduce((acc, stop) => {
            acc[stop.stop_id] = {
                stop_id: stop.stop_id,
                stop_lat: stop.stop_lat,
                stop_lon: stop.stop_lon
            };
            return acc;
        }, {});

        // Group stop orders by route_id
        const stopOrdersByRoute = stopOrders.reduce((acc, order) => {
            const routeId = tripToRouteMap[order.trip_id];

            if (!acc[routeId]) {
                acc[routeId] = [];
            }

            // Only add if we have the stop information
            if (stopsMap[order.stop_id]) {
                acc[routeId].push({
                    ...stopsMap[order.stop_id],
                    stop_sequence: order.stop_sequence
                });
            }

            return acc;
        }, {});

        // Add stops to each route
        Object.keys(tripsByRoute).forEach(routeId => {
            if (stopOrdersByRoute[routeId]) {
                // Sort stops by stop_sequence
                const sortedStops = stopOrdersByRoute[routeId].sort((a, b) =>
                    a.stop_sequence - b.stop_sequence
                );

                // Assign stops directly to the route
                tripsByRoute[routeId].stops = sortedStops;
            } else {
                // Initialize empty stops array if no stops found
                tripsByRoute[routeId].stops = [];
            }
        });

        return tripsByRoute;
    }
}

const tripMappingService = new TripMappingService();
export default tripMappingService;