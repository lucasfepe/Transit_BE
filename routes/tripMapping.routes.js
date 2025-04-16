// routes/tripMapping.routes.js
import { Router } from 'express';
import tripMappingController from '../controllers/tripMapping.controller.js';

const router = Router();

// Lightweight endpoint for trip-to-route mappings
router.post('/', tripMappingController.getTripMappings);

// Detailed endpoint for route shapes and stops
router.get('/route/:routeId', tripMappingController.getRouteDetails);

export default router;