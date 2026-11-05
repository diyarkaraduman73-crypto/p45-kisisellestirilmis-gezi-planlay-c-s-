// SUNUM KATMANI (API): HTTP isteğini okur, servisi çağırır, JSON döner.
import * as poiService from '../services/poiService.js';

export const listInterests = async (_req, res) => res.json(await poiService.listInterests());
export const listCities = async (_req, res) => res.json(await poiService.listCities());

export const listPois = async (req, res) =>
  res.json(await poiService.listPois({ city: req.query.city, interests: req.query.interests, search: req.query.q }));

export const getPoi = async (req, res) => res.json(await poiService.getPoi(req.params.id));
export const createPoi = async (req, res) => res.status(201).json(await poiService.createPoi(req.body || {}));
export const updatePoi = async (req, res) => res.json(await poiService.updatePoi(req.params.id, req.body || {}));
export const deletePoi = async (req, res) => {
  await poiService.deletePoi(req.params.id);
  res.status(204).end();
};
