// SUNUM KATMANI: URL -> controller eşlemesi.
import { Router } from 'express';
import * as poiController from '../controllers/poiController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(poiController.listPois));      // GET /api/pois?city=İstanbul&interests=tarih,doga
router.get('/:id', asyncHandler(poiController.getPoi));     // GET /api/pois/3

export default router;
