import { Router } from 'express';
import * as c from '../controllers/tripController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';

const router = Router();

router.post('/', h(c.create));              // POST   /api/trips
router.get('/shared/:code', h(c.getShared)); // GET    /api/trips/shared/Ab12Cd34
router.get('/:id', h(c.get));               // GET    /api/trips/1
router.patch('/:id', h(c.update));          // PATCH  /api/trips/1
router.delete('/:id', h(c.remove));         // DELETE /api/trips/1

export default router;
