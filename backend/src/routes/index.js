import { Router } from 'express';
import { hasDb } from '../config/db.js';
import poisRouter from './pois.js';
import usersRouter from './users.js';
import tripsRouter from './trips.js';
import authRouter from './auth.js';
import * as poiController from '../controllers/poiController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', database: hasDb() ? 'postgres' : 'bellek (seed verisi)', time: new Date().toISOString() });
});
router.get('/interests', h(poiController.listInterests));
router.get('/cities', h(poiController.listCities));
router.use('/auth', authRouter);
router.use('/pois', poisRouter);
router.use('/users', usersRouter);
router.use('/trips', tripsRouter);

export default router;
