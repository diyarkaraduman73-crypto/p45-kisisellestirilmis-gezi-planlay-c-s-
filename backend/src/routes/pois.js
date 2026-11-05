// SUNUM KATMANI: URL -> controller eşlemesi.
import { Router } from 'express';
import * as c from '../controllers/poiController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', h(c.listPois));        // GET    /api/pois?city=İstanbul&interests=tarih,doga&q=gal
router.get('/:id', h(c.getPoi));       // GET    /api/pois/3
router.post('/', h(c.createPoi));      // POST   /api/pois
router.patch('/:id', h(c.updatePoi));  // PATCH  /api/pois/3
router.delete('/:id', h(c.deletePoi)); // DELETE /api/pois/3

export default router;
