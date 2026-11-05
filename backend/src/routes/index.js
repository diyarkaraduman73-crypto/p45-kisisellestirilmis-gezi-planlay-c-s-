import { Router } from 'express';
import { hasDb } from '../config/db.js';
import poisRouter from './pois.js';
import * as poiController from '../controllers/poiController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', database: hasDb() ? 'postgres' : 'bellek (seed verisi)', time: new Date().toISOString() });
});
router.get('/interests', asyncHandler(poiController.listInterests));
router.use('/pois', poisRouter);

// Sonraki haftalar: /users, /trips (rota üretimi), /trips/:id/days (gün planı), /recommendations

export default router;
