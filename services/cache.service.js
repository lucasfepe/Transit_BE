const NodeCache = require('node-cache');

class CacheService {
    constructor() {
        // Create cache with 24 hour TTL (in seconds)
        this.cache = new NodeCache({ 
            stdTTL: 24 * 60 * 60,
            checkperiod: 60 * 60 // Check for expired keys every hour
        });

        // Bind methods
        this.getTripMapping = this.getTripMapping.bind(this);
        this.setTripMapping = this.setTripMapping.bind(this);
        this.getMultipleTripMappings = this.getMultipleTripMappings.bind(this);
    }

    getTripMapping(tripId) {
        return this.cache.get(tripId);
    }

    setTripMapping(tripId, mapping) {
        return this.cache.set(tripId, mapping);
    }

    getMultipleTripMappings(tripIds) {
        const cached = new Map();
        const uncached = [];

        tripIds.forEach(tripId => {
            const mapping = this.getTripMapping(tripId);
            if (mapping) {
                cached.set(tripId, mapping);
            } else {
                uncached.push(tripId);
            }
        });

        return {
            cached: Array.from(cached.values()),
            uncachedTripIds: uncached
        };
    }

    clearCache() {
        this.cache.flushAll();
    }
}

module.exports = new CacheService();