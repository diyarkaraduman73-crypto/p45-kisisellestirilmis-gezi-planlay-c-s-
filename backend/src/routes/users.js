import { Router } from 'express';
import * as c from '../controllers/userController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const admin = requireRole('yonetici');

router.use(requireAuth); // bu router'daki tüm uçlar giriş gerektirir

router.get('/', admin, h(c.list));                  // yönetici: tüm kullanıcılar
router.post('/', admin, h(c.create));               // yönetici: kullanıcı ekle (rol seçebilir)
router.get('/:id', h(c.get));                       // kendisi veya yönetici (serviste kontrol)
router.patch('/:id', h(c.update));                  // kendisi veya yönetici
router.patch('/:id/role', admin, h(c.changeRole));  // yönetici: rol değiştir
router.delete('/:id', h(c.remove));                 // kendisi veya yönetici
router.get('/:id/trips', h(c.listTrips));           // kendisi veya yönetici

export default router;
