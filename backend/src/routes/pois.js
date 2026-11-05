// SUNUM KATMANI: URL -> controller eşlemesi.
import { Router } from 'express';
import * as c from '../controllers/poiController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const admin = [requireAuth, requireRole('yonetici')];

router.get('/', h(c.listPois));                 // herkese açık: GET /api/pois?city=&interests=&q=
router.get('/:id', h(c.getPoi));                // herkese açık
router.post('/', ...admin, h(c.createPoi));     // yalnızca yönetici
router.patch('/:id', ...admin, h(c.updatePoi)); // yalnızca yönetici
router.delete('/:id', ...admin, h(c.deletePoi));// yalnızca yönetici

export default router;
