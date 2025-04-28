

// routes/route.routes.js
import { Router } from 'express';
import notificationsController from '../controllers/notification.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/test', isAuthenticated, notificationsController.testNotification);


export default router;