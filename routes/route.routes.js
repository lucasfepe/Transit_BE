// routes/route.routes.js
import { Router } from 'express';
import routeController from '../controllers/route.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/nearby', isAuthenticated, routeController.getRoutesNear);
router.get('/', isAuthenticated,  routeController.getAllRoutes)

export default router;