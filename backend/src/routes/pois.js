// SUNUM KATMANI: POI kataloğu uçları
import { Router } from 'express';
import * as c from '../controllers/poiController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';

const router = Router();
const admin = [requireAuth, requireRole('yonetici')];

// GET /api/pois?city=&interests=tarih,doga&tags=bogaz&q=gal&priceMax=1&lat=41.03&lng=28.98&radiusKm=2
// Herkese açık; yönetici includeInactive=1 ile pasifleri de görebilir.
router.get('/', optionalAuth, h(c.listPois));
router.get('/for-me', requireAuth, h(c.forMe));          // ilgi profiline göre puanlı liste ('/:id'den önce!)
router.get('/:id', optionalAuth, h(c.getPoi));
router.post('/', ...admin, h(c.createPoi));
router.patch('/:id', ...admin, h(c.updatePoi));
router.delete('/:id', ...admin, h(c.deletePoi));         // planda kullanılıyorsa pasifleştirir

export default router;
