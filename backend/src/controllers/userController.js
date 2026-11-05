// SUNUM KATMANI (API): kullanıcılar. req.actor = giriş yapmış kullanıcı (requireAuth)
import * as userService from '../services/userService.js';
import * as tripService from '../services/tripService.js';

export const list = async (req, res) => res.json(await userService.listUsers(req.query));
export const get = async (req, res) => res.json(await userService.getUser(req.actor, req.params.id));
export const create = async (req, res) => res.status(201).json(await userService.createUserAsAdmin(req.body || {}));
export const update = async (req, res) => res.json(await userService.updateUser(req.actor, req.params.id, req.body || {}));
export const changeRole = async (req, res) =>
  res.json(await userService.changeRole(req.actor, req.params.id, req.body?.role));
export const remove = async (req, res) => {
  await userService.deleteUser(req.actor, req.params.id);
  res.status(204).end();
};
export const listTrips = async (req, res) => res.json(await tripService.listUserTrips(req.actor, req.params.id));
