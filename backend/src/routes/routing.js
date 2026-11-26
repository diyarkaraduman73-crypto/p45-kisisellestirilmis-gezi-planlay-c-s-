// Harita entegrasyonu: kaydedilmemiş plan (önizleme) için gerçek yürüme yolu
import { Router } from 'express';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../utils/rateLimit.js';
import { routing, validatePoints } from '../services/routingService.js';
import * as cityRepository from '../repositories/cityRepository.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

// POST /api/routing/path  { city?, points: [{lat,lng}], modes?: ['yuruyus'|'toplu-tasima'|null] }
router.post('/path', requireAuth, rateLimit({ max: 60, windowMs: 60_000 }), h(async (req, res) => {
  const body = req.body || {};
  const city = await cityRepository.findByName(String(body.city || 'İstanbul'));
  if (!city) throw new ValidationError('Şehir bulunamadı');
  const { points, error } = validatePoints(body.points, city);
  if (error) throw new ValidationError(error);
  const modes = Array.isArray(body.modes) ? body.modes.map((m) => (m === 'yuruyus' || m === 'toplu-tasima' ? m : null)) : [];
  res.json(await routing.walkingPath(points, modes));
}));

export default router;
