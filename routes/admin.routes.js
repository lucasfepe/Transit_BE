

import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';

const router = Router();

router.post('/clearcache', adminController.clearCache);

export default router;

