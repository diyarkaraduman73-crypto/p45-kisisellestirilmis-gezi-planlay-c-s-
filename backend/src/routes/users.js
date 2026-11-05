import { Router } from 'express';
import * as c from '../controllers/userController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', h(c.list));               // GET    /api/users?limit=20&offset=0
router.post('/', h(c.create));            // POST   /api/users
router.get('/:id', h(c.get));             // GET    /api/users/1
router.patch('/:id', h(c.update));        // PATCH  /api/users/1
router.delete('/:id', h(c.remove));       // DELETE /api/users/1
router.get('/:id/trips', h(c.listTrips)); // GET    /api/users/1/trips

export default router;
