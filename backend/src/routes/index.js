import { readFileSync } from 'node:fs';
import { Router } from 'express';
import { hasDb } from '../config/db.js';
import poisRouter from './pois.js';
import usersRouter from './users.js';
import tripsRouter from './trips.js';
import routingRouter from './routing.js';
import { routing } from '../services/routingService.js';
import * as aiGuideService from '../services/aiGuideService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import authRouter from './auth.js';
import { tagsRouter, profileRouter } from './catalog.js';
import * as poiController from '../controllers/poiController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';

const router = Router();

// Çalışan sürüm (package.json → "version"). Ara sürümden itibaren yayındaki sürüm buradan kontrol edilir.
const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok', version, database: hasDb() ? 'postgres' : 'bellek (seed verisi)',
    // Harici servisler: yalnızca "ayarlı mı" bilgisi; anahtarın kendisi asla döndürülmez
    services: {
      harita: routing.isConfigured() ? 'openrouteservice' : 'duz-cizgi (anahtar yok)',
      yapayZeka: aiGuideService.isConfigured() ? `groq (${aiGuideService.modelName()})` : 'sablon (anahtar yok)',
    },
    time: new Date().toISOString(),
  });
});
router.get('/interests', h(poiController.listInterests));
router.get('/cities', h(poiController.listCities));
router.use('/auth', authRouter);
router.use('/pois', poisRouter);
router.use('/tags', tagsRouter);
router.use('/profile', profileRouter);
router.use('/users', usersRouter);
router.use('/trips', tripsRouter);
router.use('/routing', routingRouter);
// Yapay zekâ kullanım günlüğü (yalnızca yönetici): model, istem sürümü, doğrulama durumu, süre
router.get('/ai-logs', requireAuth, requireRole('yonetici'), h(async (req, res) => res.json(await aiGuideService.listLogs(req.query.limit))));

export default router;
