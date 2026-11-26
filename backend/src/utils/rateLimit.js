// Bellek içi hız sınırı ve önbellek yardımcıları (tek sunucu için yeterli; Render ücretsiz planda tek örnek çalışır).
import { AppError } from './errors.js';

// Kayan pencere: son `windowMs` içinde en fazla `max` işlem.
//  take(key) → { ok: true } veya { ok: false, retryAfter: saniye }
export function createRateLimiter({ max, windowMs, now = () => Date.now() }) {
  const hits = new Map(); // key → zaman damgaları
  return {
    take(key = 'genel') {
      const t = now();
      const list = (hits.get(key) || []).filter((x) => t - x < windowMs);
      if (list.length >= max) {
        hits.set(key, list);
        return { ok: false, retryAfter: Math.ceil((windowMs - (t - list[0])) / 1000) };
      }
      list.push(t);
      hits.set(key, list);
      if (hits.size > 5000) hits.delete(hits.keys().next().value); // bellek sınırı
      return { ok: true };
    },
  };
}

// Express ara katmanı: kullanıcı (giriş yaptıysa) ya da IP başına sınır → 429 + Retry-After
export function rateLimit({ max, windowMs, message = 'Çok fazla istek gönderdiniz, biraz sonra tekrar deneyin.' }) {
  const limiter = createRateLimiter({ max, windowMs });
  return (req, res, next) => {
    const key = req.actor ? `u${req.actor.id}` : `ip${req.ip}`;
    const r = limiter.take(key);
    if (r.ok) return next();
    res.setHeader('Retry-After', String(r.retryAfter));
    const err = new AppError(message, 429);
    next(err);
  };
}

// Süreli ve boyut sınırlı önbellek (en eski kayıt önce silinir)
export function createTtlCache({ max = 500, ttlMs = 24 * 60 * 60 * 1000, now = () => Date.now() } = {}) {
  const map = new Map();
  return {
    get(key) {
      const e = map.get(key);
      if (!e) return undefined;
      if (now() > e.expires) { map.delete(key); return undefined; }
      map.delete(key); map.set(key, e); // en son kullanılan sona
      return e.value;
    },
    set(key, value) {
      map.delete(key);
      map.set(key, { value, expires: now() + ttlMs });
      if (map.size > max) map.delete(map.keys().next().value);
    },
    get size() { return map.size; },
  };
}
