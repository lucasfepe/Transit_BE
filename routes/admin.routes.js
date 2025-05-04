import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Admin cache operations
router.post('/clearcache', isAdmin, adminController.clearCache);

// Admin user operations
router.post('/clear-push-tokens', isAdmin, adminController.clearAllPushTokens);

// Admin notification operations
router.post('/broadcast-notification', isAdmin, adminController.broadcastNotification);

export default router;