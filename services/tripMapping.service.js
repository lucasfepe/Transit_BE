const mongoose = require('mongoose');
const cacheService = require('./cacheService');

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
        dbMappings.forEach(mapping => {
            cacheService.setTripMapping(mapping.trip_id, mapping);
        });

        // Return combined results
        return [...cached, ...dbMappings];
    }

    async fetchMappingsFromDb(tripIds) {
        return await Trip.aggregate([
            { 
                $match: { 
                    trip_id: { $in: tripIds } 
                } 
            },
            {
                $lookup: {
                    from: 'routes',
                    localField: 'route_id',
                    foreignField: 'route_id',
                    as: 'route'
                }
            },
            {
                $unwind: '$route'  // Converts route array to single object
            },
            {
                $lookup: {
                    from: 'shapes',
                    localField: 'route.shape_id',
                    foreignField: 'shape_id',
                    as: 'shape'
                }
            },
            {
                $unwind: '$shape'  // Converts shape array to single object
            },
            {
                $project: {
                    trip_id: 1,
                    route_id: '$route.route_id',
                    route_name: '$route.route_name',
                    shape: {
                        shape_id: '$shape.shape_id',
                        coordinates: '$shape.coordinates'
                    }
                }
            }
        ]);
    }
}
module.exports = new TripMappingService();