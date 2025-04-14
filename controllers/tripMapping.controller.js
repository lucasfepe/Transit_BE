// tripMapping.controller.js
import tripMappingService from '../services/tripMapping.service.js';

class TripMappingController {
    async getTripMappings(req, res, next) {
        try {
            const { tripIds } = req.body;

            
            if (!Array.isArray(tripIds) || tripIds.length === 0) {
                const error = new Error('Invalid trip IDs');
                return res.status(400).json({ message: error.message });
            }

            // if (tripIds.length > 100) {
            //     const error = new Error('Too many trips requested');
            //     return res.status(400).json({ message: error.message });
            // }

            const mappings = await tripMappingService.getMappingsForTrips(tripIds);
            console.log("count:", Object.keys(mappings).length)
            res.json(mappings);
        } catch (error) {
            // Pass the error message in the expected format
            res.status(500).json({ message: error.message });
        }
    }
}

const tripMappingController = new TripMappingController();
export default tripMappingController;