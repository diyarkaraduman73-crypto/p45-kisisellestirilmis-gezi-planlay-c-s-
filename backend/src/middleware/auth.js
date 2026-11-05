// YETKİLENDİRME KATMANI
// requireAuth  → "Kim olduğunu kanıtla" (kimlik doğrulama / authentication) → yoksa 401
// requireRole  → "Bunu yapmaya yetkin var mı?" (yetkilendirme / authorization) → yoksa 403
// optionalAuth → Herkese açık uçlarda: token varsa kullanıcıyı tanı, yoksa ziyaretçi olarak devam et
import * as authService from '../services/authService.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

function bearer(req) {
  const h = req.headers.authorization || '';
  const [scheme, token] = h.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

export async function requireAuth(req, _res, next) {
  try {
    const token = bearer(req);
    if (!token) throw new UnauthorizedError();
    req.actor = await authService.authenticate(token); // { id, role, sessionId, user }
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req, _res, next) {
  const token = bearer(req);
  if (!token) return next();
  try {
    req.actor = await authService.authenticate(token);
  } catch {
    // Geçersiz token herkese açık uçta hata değildir; ziyaretçi gibi davranılır.
  }
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.actor) return next(new UnauthorizedError());
    if (!roles.includes(req.actor.role)) return next(new ForbiddenError());
    next();
  };
}
