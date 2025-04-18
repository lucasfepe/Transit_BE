// controllers/route.controller.js
import { findTransitRoutesNear } from '../services/route.service.js'

// Create a controller object with methods
const routeController = {
  getRoutesNear: async(req, res, next) => {
    try {
        const { lat, lon, distance } = req.query;
        
        // Validate parameters
        if (!lat || !lon || !distance) {
            return res.status(400).json({ 
                message: 'Latitude, longitude, and distance are required parameters' 
            });
        }
        
        // Convert string parameters to numbers
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        const distanceMeters = parseFloat(distance);
        
        // Validate numeric values
        if (isNaN(latitude) || isNaN(longitude) || isNaN(distanceMeters)) {
            return res.status(400).json({ 
                message: 'Latitude, longitude, and distance must be valid numbers' 
            });
        }
        
        // Get routes near the specified coordinates
        const nearbyRoutes = await findTransitRoutesNear(latitude, longitude, distanceMeters);
        console.log("log:",JSON.stringify(nearbyRoutes.length))
        console.log("param:",latitude, longitude, distanceMeters)
        res.json(nearbyRoutes);
    } catch (error) {
        console.error('Error finding nearby routes:', error);
        res.status(500).json({ message: error.message });
    }
  }
};

// Export the controller object as default
export default routeController;