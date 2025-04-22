// services/vehicleTracking.service.js
import axios from 'axios';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import notificationService from './notification.service.js';
import tripMappingService from './tripMapping.service.js';
import { getSubscriptionModel } from '../models/Subscription.js';

class VehicleTrackingService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
    this.lastSuccessfulFetch = 0;
    this.routeCache = new Map(); // Cache for trip to route mapping only
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
  
  // Get active subscriptions and their route IDs
  async getActiveSubscribedRoutes() {
    try {
      const Subscription = getSubscriptionModel();
      const activeSubscriptions = await Subscription.find({ active: true });
      
      // Extract unique route IDs
      const routeIds = new Set();
      for (const sub of activeSubscriptions) {
        if (sub.route_id) {
          routeIds.add(sub.route_id);
        }
      }
      
      return routeIds;
    } catch (error) {
      console.error('Error getting active subscribed routes:', error.message);
      return new Set();
    }
  }
  
  // Get route ID for a trip with caching
  async getRouteForTrip(tripId) {
    // Check cache first
    if (this.routeCache.has(tripId)) {
      return this.routeCache.get(tripId);
    }
    
    // Get from service
    const routeId = await tripMappingService.getRouteForTrip(tripId);
    
    // Update cache
    if (routeId) {
      this.routeCache.set(tripId, routeId);
      
      // Limit cache size to prevent memory leaks
      if (this.routeCache.size > 1000) {
        // Remove oldest entries
        const keysToDelete = Array.from(this.routeCache.keys()).slice(0, 100);
        for (const key of keysToDelete) {
          this.routeCache.delete(key);
        }
      }
    }
    
    return routeId;
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
      
      // Get active subscribed routes (fresh every time)
      const subscribedRouteIds = await this.getActiveSubscribedRoutes();
      
      // If there are no subscribed routes, skip the API call entirely
      if (subscribedRouteIds.size === 0) {
        console.log('No active subscriptions, skipping vehicle location fetch');
        return;
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
      const processedTrips = new Set(); // To avoid duplicate work for trip-to-route mapping
      
      // Process each entity
      for (const entity of feed.entity) {
        try {
          if (entity.vehicle?.vehicle && entity.vehicle?.position) {
            const vehicle = entity.vehicle;
            const tripId = vehicle.trip?.tripId;
            
            if (!tripId) continue;
            
            // Skip if we've already processed this trip
            if (processedTrips.has(tripId)) continue;
            processedTrips.add(tripId);
            
            // Get the route ID for this trip
            const routeId = await this.getRouteForTrip(tripId);
            
            // Skip if no route ID or if the route doesn't have any subscriptions
            if (!routeId || !subscribedRouteIds.has(routeId)) {
              continue;
            }
            
            const vehicleData = {
              id: vehicle.vehicle.id || 'unknown',
              latitude: vehicle.position.latitude,
              longitude: vehicle.position.longitude,
              tripId: tripId,
              routeId: routeId,
              label: vehicle.vehicle.label || 'N/A',
              speed: vehicle.position.speed || 0
            };
            
            vehicles.push(vehicleData);
          }
        } catch (entityError) {
          console.warn(`Error processing entity:`, entityError.message);
          // Continue with next entity
        }
      }
      
      console.log(`Successfully processed ${vehicles.length} vehicles on subscribed routes`);
      
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