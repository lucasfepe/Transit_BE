import { Router } from 'express';
import tripMappingRoutes from './tripMapping.routes.js';
import adminRoutes from './admin.routes.js';
import routeRoutes from './route.routes.js';

const router = Router();

router.use('/tripmapping', tripMappingRoutes);
router.use('/admin', adminRoutes);
router.use('/routes', routeRoutes);

export default router;