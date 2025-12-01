import { Router } from 'express';
import * as LocationController from '../controllers/location.controller';

const router = Router();

router.get('/search', LocationController.getLocation);
router.get('/reverse', LocationController.getAddress);

export default router;
