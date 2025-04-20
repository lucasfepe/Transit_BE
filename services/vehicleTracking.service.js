// services/vehicleTracking.service.js
import axios from 'axios';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import notificationService from './notification.service.js';
import tripMappingService from './tripMapping.service.js';

class VehicleTrackingService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
    this.lastSuccessfulFetch = 0;
  }
  
  // Start the tracking service
  start() {
    if (this.isRunning) {
      console.log('Vehicle tracking service is already running');
      return;
    }
    
    console.log('Starting vehicle tracking service');
    this.isRunning = true;
    
    // Fetch immediately on start
    this.fetchVehicleLocations();
    
    // Set up interval for periodic fetching (every 30 seconds)
    this.interval = setInterval(() => {
      this.fetchVehicleLocations();
    }, 30000);
  }
  
  // Stop the tracking service
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    console.log('Stopping vehicle tracking service');
    clearInterval(this.interval);
    this.interval = null;
    this.isRunning = false;
  }
  
  // Fetch vehicle locations from government API
  async fetchVehicleLocations() {
    try {
      // Check if we've had too many consecutive failures
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (now - this.lastSuccessfulFetch < fiveMinutes) {
          console.log("Too many consecutive failures, waiting before retry");
          return;
        } else {
          // Reset counter after 5 minutes to try again
          this.consecutiveFailures = 0;
        }
      }
      
      console.log('Fetching vehicle locations from government API');
      
      const response = await axios({
        method: 'get',
        url: 'https://data.calgary.ca/download/am7c-qe3u/application%2Foctet-stream',
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      });
      
      // Validate response data
      if (!response.data || response.data.byteLength === 0) {
        throw new Error("Received empty response data");
      }
      
      // Create a buffer from the response data
      const buffer = new Uint8Array(response.data);
      
      // Decode the feed
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
      
      if (!feed || !feed.entity || !Array.isArray(feed.entity)) {
        throw new Error("Invalid GTFS feed format");
      }
      
      const vehicles = [];
      
      // Process each entity
      for (const entity of feed.entity) {
        try {
          if (entity.vehicle?.vehicle && entity.vehicle?.position) {
            const vehicle = entity.vehicle;
            
            const vehicleData = {
              id: vehicle.vehicle.id || 'unknown',
              latitude: vehicle.position.latitude,
              longitude: vehicle.position.longitude,
              tripId: vehicle.trip?.tripId || 'N/A',
              label: vehicle.vehicle.label || 'N/A',
              speed: vehicle.position.speed || 0
            };
            
            // Get the route ID for this trip
            vehicleData.routeId = await tripMappingService.getRouteForTrip(vehicleData.tripId);
            
            if (vehicleData.routeId) {
              vehicles.push(vehicleData);
            }
          }
        } catch (entityError) {
          console.warn(`Error processing entity:`, entityError.message);
          // Continue with next entity
        }
      }
      
      console.log(`Successfully processed ${vehicles.length} vehicles`);
      
      // Process vehicles for notifications
      if (vehicles.length > 0) {
        await notificationService.processVehicleLocations(vehicles);
      }
      
      // Reset failure counter and update last successful fetch time
      this.consecutiveFailures = 0;
      this.lastSuccessfulFetch = Date.now();
      
    } catch (error) {
      this.consecutiveFailures++;
      console.error('Error fetching vehicle locations:', error.message);
    }
  }
}

const vehicleTrackingService = new VehicleTrackingService();
export default vehicleTrackingService;