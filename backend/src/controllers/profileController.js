// SUNUM KATMANI (API): İlgi profili — her zaman giriş yapan kullanıcının kendi profili
import * as profileService from '../services/profileService.js';

export const get = async (req, res) => res.json(await profileService.getProfile(req.actor));
export const update = async (req, res) => res.json(await profileService.updateProfile(req.actor, req.body || {}));
