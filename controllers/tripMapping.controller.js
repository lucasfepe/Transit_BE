const tripMappingService = require('../services/tripMapping.service');

class TripMappingController {
    async getTripMappings(req, res, next) {
        try {
            const { tripIds } = req.body;

            if (!Array.isArray(tripIds) || tripIds.length === 0) {
                return res.status(400).json({ error: 'Invalid trip IDs' });
            }

            if (tripIds.length > 100) {
                return res.status(400).json({ error: 'Too many trips requested' });
            }

            const mappings = await tripMappingService.getMappingsForTrips(tripIds);
            res.json(mappings);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TripMappingController();