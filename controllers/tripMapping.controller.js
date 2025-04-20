// controllers/tripMapping.controller.js
import tripMappingService from '../services/tripMapping.service.js';

class TripMappingController {
    async getTripMappings(req, res, next) {
        try {
            const { tripIds } = req.body;

            if (!Array.isArray(tripIds) || tripIds.length === 0) {
                const error = new Error('Invalid trip IDs');
                return res.status(400).json({ message: error.message });
            }

            // Get lightweight mappings (trip-to-route only)
            const mappings = await tripMappingService.getLightMappingsForTrips(tripIds);
            console.log("count:", Object.keys(mappings).length);
            console.log("mappings:", JSON.stringify(mappings));
            res.json(mappings);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getRouteDetails(req, res, next) {
        try {
            const { routeId } = req.params;

            if (!routeId) {
                const error = new Error('Route ID is required');
                return res.status(400).json({ message: error.message });
            }
            console.log("getRouteDetails:", routeId);
            // Get detailed route information (shapes and stops)
            const routeDetails = await tripMappingService.getRouteDetails(routeId);

            if (!routeDetails) {
                return res.status(404).json({ message: 'Route not found' });
            }
            
            res.json(routeDetails);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

const tripMappingController = new TripMappingController();
export default tripMappingController;