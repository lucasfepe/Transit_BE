

import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/clearcache', isAdmin, adminController.clearCache);

export default router;

