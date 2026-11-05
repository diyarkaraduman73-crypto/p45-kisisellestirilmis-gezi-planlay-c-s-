import { Router } from 'express';
import * as c from '../controllers/tripController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/shared/:code', h(c.getShared));          // herkese açık (paylaşım bağlantısı)
router.post('/', requireAuth, h(c.create));           // giriş gerekli; rota giriş yapan adına
router.get('/:id', requireAuth, h(c.get));            // sahibi veya yönetici
router.patch('/:id', requireAuth, h(c.update));       // sahibi veya yönetici
router.delete('/:id', requireAuth, h(c.remove));      // sahibi veya yönetici

export default router;
