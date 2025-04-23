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
    this.vehicleCache = []; // Store all vehicles here
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

  // Method to get vehicles near a location
  async getVehiclesNearLocation(latitude, longitude, radiusInMeters) {
    // Check if we need to refresh the cache (if it's been more than 30 seconds)
    const now = Date.now();
    const thirtySeconds = 30 * 1000;

    if (this.vehicleCache.length === 0 || now - this.lastSuccessfulFetch > thirtySeconds) {
      console.log('Cache expired or empty, fetching fresh data from government API');
      await this.fetchVehicleLocations(false); // false means don't filter by subscriptions
    } else {
      console.log(`Using cached vehicle data (${Math.round((now - this.lastSuccessfulFetch) / 1000)}s old)`);
    }

    // Filter vehicles by distance
    const nearbyVehicles = this.vehicleCache.filter(vehicle => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        vehicle.latitude,
        vehicle.longitude
      );
      return distance <= radiusInMeters;
    });

    console.log(`Found ${nearbyVehicles.length} vehicles within ${radiusInMeters / 1609.34} miles`);
    return nearbyVehicles;
  }

  // Helper method to calculate distance between two points using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Helper method to determine vehicle type
  determineVehicleType(vehicle) {
    // This is a simplified version - you may want to implement more sophisticated logic
    if (!vehicle || !vehicle.vehicle) return 'bus';

    const label = vehicle.vehicle.label || '';
    const id = vehicle.vehicle.id || '';

    // Check for train indicators
    if (
      label.toLowerCase().includes('train') ||
      id.toLowerCase().includes('train') ||
      label.toLowerCase().includes('lrt') ||
      id.toLowerCase().includes('lrt')
    ) {
      return 'train';
    }

    // Default to bus
    return 'bus';
  }



  // Fetch vehicle locations from government API
  async fetchVehicleLocations(filterBySubscriptions = true) {
    try {
      // Check if we've had too many consecutive failures
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (now - this.lastSuccessfulFetch < fiveMinutes) {
          console.log("Too many consecutive failures, waiting before retry");
          return [];
        } else {
          // Reset counter after 5 minutes to try again
          this.consecutiveFailures = 0;
        }
      }

      // Add debugging for last fetch time
      if (this.lastSuccessfulFetch > 0) {
        console.log(`Last successful fetch was ${Math.round((Date.now() - this.lastSuccessfulFetch) / 1000)}s ago`);
      }

      // Get subscribed routes if we're filtering
      let subscribedRouteIds = new Set();
      if (filterBySubscriptions) {
        subscribedRouteIds = await this.getActiveSubscribedRoutes();

        // If filtering by subscriptions and there are none, skip the API call
        if (subscribedRouteIds.size === 0) {
          console.log('No active subscriptions, skipping vehicle location fetch');
          return [];
        }
      }

      console.log(`Fetching ${filterBySubscriptions ? 'subscribed' : 'all'} vehicle locations from government API`);

      const response = await axios({
        method: 'get',
        url: 'https://data.calgary.ca/download/am7c-qe3u/application%2Foctet-stream',
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        params: {
          _t: Date.now() // Add cache-busting parameter
        }
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

      // Add debugging for feed timestamp and entity count
      console.log(`Feed timestamp: ${new Date(feed.header.timestamp * 1000).toISOString()}`);
      console.log(`Feed entity count: ${feed.entity.length}`);

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

            // If filtering by subscriptions, skip vehicles not on subscribed routes
            if (filterBySubscriptions && (!routeId || !subscribedRouteIds.has(routeId))) {
              continue;
            }

            // Include vehicle in results
            const vehicleData = {
              id: vehicle.vehicle.id || 'unknown',
              latitude: vehicle.position.latitude,
              longitude: vehicle.position.longitude,
              tripId: tripId,
              routeId: routeId || 'unknown',
              label: vehicle.vehicle.label || 'N/A',
              speed: vehicle.position.speed || 0,
              vehicleType: this.determineVehicleType(vehicle)
            };

            vehicles.push(vehicleData);
          }
        } catch (entityError) {
          console.warn(`Error processing entity:`, entityError.message);
          // Continue with next entity
        }
      }

      console.log(`Successfully processed ${vehicles.length} ${filterBySubscriptions ? 'subscribed' : 'total'} vehicles`);

      // Handle cache updates differently based on whether we're filtering
      if (filterBySubscriptions && vehicles.length > 0) {
        // For subscribed vehicles, merge with existing cache
        await notificationService.processVehicleLocations(vehicles);

        const vehicleMap = new Map();

        // Add existing cache first
        for (const vehicle of this.vehicleCache) {
          vehicleMap.set(vehicle.id, vehicle);
        }

        // Add/update with new vehicles
        for (const vehicle of vehicles) {
          vehicleMap.set(vehicle.id, vehicle);
        }

        // Convert back to array
        this.vehicleCache = Array.from(vehicleMap.values());
      } else {
        // For complete fetch (not filtered), replace the entire cache
        this.vehicleCache = vehicles;
      }

      // Reset failure counter and update last successful fetch time
      this.consecutiveFailures = 0;
      this.lastSuccessfulFetch = Date.now();

      return vehicles;

    } catch (error) {
      this.consecutiveFailures++;
      console.error('Error fetching vehicle locations:', error.message);
      return [];
    }
  }
}

const vehicleTrackingService = new VehicleTrackingService();
export default vehicleTrackingService;