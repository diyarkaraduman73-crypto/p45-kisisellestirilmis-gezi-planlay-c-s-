// SUNUM KATMANI: kimlik doğrulama uçları
import * as authService from '../services/authService.js';

const meta = (req) => ({ userAgent: req.headers['user-agent'] });

export const register = async (req, res) => res.status(201).json(await authService.register(req.body || {}, meta(req)));
export const login = async (req, res) => res.json(await authService.login(req.body || {}, meta(req)));
export const logout = async (req, res) => {
  await authService.logout(req.actor);
  res.status(204).end();
};
export const me = async (req, res) => res.json(req.actor.user);
export const changePassword = async (req, res) => res.json(await authService.changePassword(req.actor, req.body || {}));
