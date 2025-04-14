import { Router } from 'express';
import tripMappingRoutes from './tripMapping.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/tripmapping', tripMappingRoutes);
router.use('/admin', adminRoutes);

export default router;