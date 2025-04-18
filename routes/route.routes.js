// routes/route.routes.js
import { Router } from 'express';
import routeController from '../controllers/route.controller.js';

const router = Router();

router.get('/nearby', routeController.getRoutesNear);

export default router;