// SUNUM KATMANI (API): rotalar
import * as tripService from '../services/tripService.js';

export const get = async (req, res) => res.json(await tripService.getTrip(req.actor, req.params.id));
export const getShared = async (req, res) => res.json(await tripService.getTripByShareCode(req.params.code));
export const create = async (req, res) => res.status(201).json(await tripService.createTrip(req.actor, req.body || {}));
export const update = async (req, res) => res.json(await tripService.updateTrip(req.actor, req.params.id, req.body || {}));
export const remove = async (req, res) => {
  await tripService.deleteTrip(req.actor, req.params.id);
  res.status(204).end();
};
