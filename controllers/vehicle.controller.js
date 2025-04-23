// controllers/vehicle.controller.js
import vehicleTrackingService from '../services/vehicleTracking.service.js';

export const getVehiclesNearLocation = async (req, res, next) => {
  try {
    const { lat, lon, radius = 1 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
        vehicles: []
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const radiusInMeters = parseFloat(radius) * 1609.34; // Convert miles to meters

    // Get vehicles from the tracking service
    const vehicles = await vehicleTrackingService.getVehiclesNearLocation(latitude, longitude, radiusInMeters);
    console.log(JSON.stringify(vehicles));
    // Return in the format expected by the frontend
    res.status(200).json({
      success: true,
      vehicles: vehicles
    });
  } catch (error) {
    console.error('Error in getVehiclesNearLocation:', error);

    // Return error in the expected format
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching vehicles',
      vehicles: []
    });
  }
};

export default {
  getVehiclesNearLocation
};