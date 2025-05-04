// routes/notification.routes.js
import { Router } from 'express';
import notificationsController from '../controllers/notification.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Test notification to a specific token
router.post('/test', isAdmin, notificationsController.testNotification);

export default router;