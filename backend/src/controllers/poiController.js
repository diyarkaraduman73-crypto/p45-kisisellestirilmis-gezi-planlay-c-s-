// SUNUM KATMANI (API): HTTP isteğini okur, servisi çağırır, JSON döner.
import * as poiService from '../services/poiService.js';

export async function listInterests(_req, res) {
  res.json(await poiService.listInterests());
}

export async function listPois(req, res) {
  res.json(await poiService.listPois({ city: req.query.city, interests: req.query.interests }));
}

export async function getPoi(req, res) {
  res.json(await poiService.getPoi(req.params.id));
}
