// controllers/vehicle.controller.js
import vehicleTrackingService from '../services/vehicleTracking.service.js';

export const getVehiclesNearLocation = async (req, res, next) => {
  try {
    const { lat, lon, radius = 1 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const radiusInMeters = parseFloat(radius) * 1609.34; // Convert miles to meters
    
    // Get vehicles from the tracking service
    const vehicles = await vehicleTrackingService.getVehiclesNearLocation(latitude, longitude, radiusInMeters);
    
    res.status(200).json(vehicles);
  } catch (error) {
    next(error);
  }
};

export default {
  getVehiclesNearLocation
};