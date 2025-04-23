// routes/vehicle.routes.js
import { Router } from 'express';
import vehicleController from '../controllers/vehicle.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

// Get vehicles near a location
router.get('/nearby', isAuthenticated, vehicleController.getVehiclesNearLocation);

export default router;