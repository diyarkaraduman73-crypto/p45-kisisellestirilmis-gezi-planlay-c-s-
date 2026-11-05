// Etiketler ve ilgi profili uçları
import { Router } from 'express';
import * as poi from '../controllers/poiController.js';
import * as profile from '../controllers/profileController.js';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const admin = [requireAuth, requireRole('yonetici')];

export const tagsRouter = Router();
tagsRouter.get('/', h(poi.listTags));                      // herkese açık
tagsRouter.post('/', ...admin, h(poi.createTag));          // yönetici
tagsRouter.delete('/:slug', ...admin, h(poi.deleteTag));   // yönetici

export const profileRouter = Router();
profileRouter.use(requireAuth);                            // profil her zaman "benim profilim"
profileRouter.get('/', h(profile.get));
profileRouter.put('/', h(profile.update));
