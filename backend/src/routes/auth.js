import { Router } from 'express';
import * as c from '../controllers/authController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', h(c.register));                       // herkese açık
router.post('/login', h(c.login));                             // herkese açık
router.post('/logout', requireAuth, h(c.logout));              // giriş gerekli
router.get('/me', requireAuth, h(c.me));                       // giriş gerekli
router.post('/password', requireAuth, h(c.changePassword));    // giriş gerekli

export default router;
