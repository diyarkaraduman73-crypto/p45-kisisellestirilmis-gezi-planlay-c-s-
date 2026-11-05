import { Router } from 'express';
import * as c from '../controllers/tripController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/shared/:code', h(c.getShared));          // herkese açık, yalnızca paylaşım açıksa
router.post('/plan', requireAuth, h(c.plan));         // önizleme: profil + kısıtlar → gün gün plan (kaydetmez)
router.post('/generate', requireAuth, h(c.generate)); // üret + kaydet (plan sunucuda yeniden üretilir)
router.post('/', requireAuth, h(c.create));           // elle rota; giriş yapan adına
router.get('/:id', requireAuth, h(c.get));            // sahibi veya yönetici
router.patch('/:id', requireAuth, h(c.update));       // sahibi veya yönetici
router.delete('/:id', requireAuth, h(c.remove));      // sahibi veya yönetici
router.post('/:id/share', requireAuth, h(c.share));   // sahibi: paylaşımı aç/kapat, bağlantıyı yenile

export default router;
