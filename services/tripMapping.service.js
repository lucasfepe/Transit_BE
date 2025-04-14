// tripMapping.service.js
import cacheService from './cache.service.js';
import { getTripModel } from '../models/Trip.js';
import { getRouteModel } from '../models/Route.js';

class TripMappingService {
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

        // Get all trips in a single query - O(n)
        const trips = await Trip.find({ 
            trip_id: { $in: tripIds }
        });

        // Create a map of route_short_name to trip_ids - O(n)
        const tripsByRoute = trips.reduce((acc, trip) => {
            if (!acc[trip.route_id]) {
                acc[trip.route_id] = {
                    trip_ids: []
                };
            }
            acc[trip.route_id].trip_ids.push(trip.trip_id);
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

        return tripsByRoute;
    }
}

const tripMappingService = new TripMappingService();
export default tripMappingService;