// SUNUM KATMANI (API): POI kataloğu, etiketler, referans listeleri
import * as poiService from '../services/poiService.js';
import * as tagService from '../services/tagService.js';
import * as profileService from '../services/profileService.js';

export const listInterests = async (_req, res) => res.json(await poiService.listInterests());
export const listCities = async (_req, res) => res.json(await poiService.listCities());

export const listPois = async (req, res) => res.json(await poiService.listPois(req.query, req.actor));
export const forMe = async (req, res) => res.json(await profileService.recommendPois(req.actor, req.query));
export const getPoi = async (req, res) => res.json(await poiService.getPoi(req.params.id, req.actor));
export const createPoi = async (req, res) => res.status(201).json(await poiService.createPoi(req.body || {}, req.actor));
export const updatePoi = async (req, res) => res.json(await poiService.updatePoi(req.params.id, req.body || {}));
export const deletePoi = async (req, res) => res.json(await poiService.deletePoi(req.params.id));

export const listTags = async (_req, res) => res.json(await tagService.listTags());
export const createTag = async (req, res) => res.status(201).json(await tagService.createTag(req.body || {}));
export const deleteTag = async (req, res) => {
  await tagService.deleteTag(req.params.slug);
  res.status(204).end();
};
