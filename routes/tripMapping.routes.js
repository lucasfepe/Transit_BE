import { Router } from 'express';
import tripMappingController from '../controllers/tripMapping.controller.js';

const router = Router();

router.post('/', tripMappingController.getTripMappings);

export default router;