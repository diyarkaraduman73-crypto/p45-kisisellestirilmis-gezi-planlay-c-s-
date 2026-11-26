import { Router } from 'express';
import * as c from '../controllers/tripController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../utils/rateLimit.js';

// Harita yolu uçları harici servise gidebildiği için kullanıcı/IP başına sınırlı (Hafta 9)
const pathLimit = rateLimit({ max: 60, windowMs: 60_000 });
// Yapay zekâ rehberi: kullanıcı başına 10 dakikada 5 üretim (Hafta 10, Y6)
const guideLimit = rateLimit({ max: 5, windowMs: 10 * 60_000, message: 'Kısa sürede çok fazla rehber ürettiniz; 10 dakika içinde tekrar deneyin.' });

const router = Router();

router.get('/shared/:code', h(c.getShared));          // herkese açık, yalnızca paylaşım açıksa
router.get('/shared/:code/days/:day/path', pathLimit, h(c.sharedDayPath)); // herkese açık, başlangıç noktası hariç
router.post('/plan', requireAuth, h(c.plan));         // önizleme: profil + kısıtlar → gün gün plan (kaydetmez)
router.post('/generate', requireAuth, h(c.generate)); // üret + kaydet (plan sunucuda yeniden üretilir)
router.post('/', requireAuth, h(c.create));           // elle rota; giriş yapan adına
router.get('/:id', requireAuth, h(c.get));            // sahibi veya yönetici
router.patch('/:id', requireAuth, h(c.update));       // sahibi veya yönetici
router.delete('/:id', requireAuth, h(c.remove));      // sahibi veya yönetici
router.get('/:id/days/:day/path', requireAuth, pathLimit, h(c.dayPath)); // gerçek yürüme yolu (harita servisi)
router.post('/:id/guide', requireAuth, guideLimit, h(c.guide)); // yapay zekâ ile kişisel gezi rehberi + öneriler
router.post('/:id/share', requireAuth, h(c.share));   // sahibi: paylaşımı aç/kapat, bağlantıyı yenile

export default router;
