import { Router } from 'express';
import tripMappingRoutes from './tripMapping.routes.js';
import adminRoutes from './admin.routes.js';
import routeRoutes from './route.routes.js';
import userRoutes from './user.routes.js';
import subscriptionRoutes from './subscription.routes.js';
import stopRoutes from './stop.routes.js';
import vehicleRoutes from './vehicle.routes.js';

const router = Router();

router.use('/tripmapping', tripMappingRoutes);
router.use('/admin', adminRoutes);
router.use('/routes', routeRoutes);
router.use('/users', userRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/stops', stopRoutes);
router.use('/vehicles', vehicleRoutes);

export default router;