// cache.service.js
import NodeCache from 'node-cache';

class CacheService {
    constructor() {
        // Cache for route mappings
        this.routeCache = new NodeCache({ 
            stdTTL: 24 * 60 * 60,
            checkperiod: 60 * 60
        });

        // Cache for trip to route mapping
        this.tripToRouteCache = new NodeCache({ 
            stdTTL: 24 * 60 * 60,
            checkperiod: 60 * 60
        });

        // Bind methods
        this.getTripMapping = this.getTripMapping.bind(this);
        this.setTripMapping = this.setTripMapping.bind(this);
        this.getMultipleTripMappings = this.getMultipleTripMappings.bind(this);
    }

    getTripMapping(tripId) {
        // Get route_id for this trip
        const routeId = this.tripToRouteCache.get(String(tripId));
        if (!routeId) return null;
        
        // Get mapping for this route
        return this.routeCache.get(String(routeId));
    }

    setTripMapping(routeId, mapping) {
        // Store the route mapping
        this.routeCache.set(String(routeId), mapping);
        
        // Store trip to route mappings
        mapping.trip_ids.forEach(tripId => {
            this.tripToRouteCache.set(String(tripId), routeId);
        });
        
        return true;
    }

    getMultipleTripMappings(tripIds) {
        const cached = {};
        const uncached = [];

        tripIds.forEach(tripId => {
            const mapping = this.getTripMapping(tripId);
            if (mapping) {
                const routeId = this.tripToRouteCache.get(String(tripId));
                cached[routeId] = mapping;
            } else {
                uncached.push(tripId);
            }
        });

        return {
            cached,
            uncachedTripIds: uncached
        };
    }

    clearCache() {
        this.routeCache.flushAll();
        this.tripToRouteCache.flushAll();
    }
}

const cacheService = new CacheService();
export default cacheService;