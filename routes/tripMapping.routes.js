// routes/tripMapping.routes.js
import { Router } from 'express';
import tripMappingController from '../controllers/tripMapping.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

// Lightweight endpoint for trip-to-route mappings
router.post('/', isAuthenticated, tripMappingController.getTripMappings);

// Detailed endpoint for route shapes and stops
router.get('/route/:routeId', isAuthenticated, tripMappingController.getRouteDetails);

export default router;