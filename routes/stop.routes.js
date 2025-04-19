// routes/tripMapping.routes.js
import { Router } from 'express';
import stopController from '../controllers/stop.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

// Lightweight endpoint for trip-to-route mappings
router.get('/route/:routeId', isAuthenticated, stopController.getStopsByRouteId);

export default router;