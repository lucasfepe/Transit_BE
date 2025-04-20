// services/cache.service.js
class CacheService {
    constructor() {
        this.tripMappingCache = {}; // Full mappings with shapes and stops
        this.lightMappingCache = {}; // Light mappings with just trip IDs
        this.routeDetailsCache = {}; // Detailed route information
        this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }

    // Get multiple trip mappings (either light or full)
    getMultipleTripMappings(tripIds, lightMode = false) {
        const cache = lightMode ? this.lightMappingCache : this.tripMappingCache;
        const cached = {};
        const uncachedTripIds = [];

        // Check each trip ID
        tripIds.forEach(tripId => {
            let found = false;

            // Look through all routes in cache
            for (const [routeId, mapping] of Object.entries(cache)) {
                if (mapping.trip_ids.includes(Number(tripId))) {
                    if (!cached[routeId]) {
                        cached[routeId] = { ...mapping };
                    }
                    found = true;
                    break;
                }
            }

            if (!found) {
                uncachedTripIds.push(tripId);
            }
        });

        return { cached, uncachedTripIds };
    }

    // Set trip mapping in cache (either light or full)
    setTripMapping(routeId, mapping, lightMode = false) {
        const cache = lightMode ? this.lightMappingCache : this.tripMappingCache;
        cache[routeId] = {
            ...mapping,
            timestamp: Date.now()
        };
    }

    // Get detailed route information
    getRouteDetails(routeId) {
        const cached = this.routeDetailsCache[routeId];
    
        if (!cached) {
            return null;
        }
    
        // Check if cache is still valid
        if (Date.now() - cached.timestamp > this.cacheTTL) {
            delete this.routeDetailsCache[routeId];
            return null;
        }
    
        return {
            route_id: routeId,
            route_long_name: cached.route_long_name, // Add route_long_name
            shape: cached.shape,
            stops: cached.stops
        };
    }

    // Set detailed route information
    setRouteDetails(routeId, details) {
        this.routeDetailsCache[routeId] = {
            ...details,
            timestamp: Date.now()
        };
    }

    // Clear all caches
    clearCache() {
        this.tripMappingCache = {};
        this.lightMappingCache = {};
        this.routeDetailsCache = {};
    }
}

const cacheService = new CacheService();
export default cacheService;