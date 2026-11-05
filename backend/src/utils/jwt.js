// JWT (JSON Web Token) - HS256, Node'un yerleşik crypto modülüyle.
// Yapı: base64url(başlık).base64url(içerik).base64url(HMAC-SHA256 imza)
// İçerik şifreli DEĞİLDİR, yalnızca imzalıdır: herkes okuyabilir ama değiştiremez.
// Bu yüzden içine parola, e-posta gibi hassas veri konmaz.
import { createHmac, timingSafeEqual } from 'node:crypto';

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const sign = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');

export function signToken(payload, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const data = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(body)}`;
  return `${data}.${sign(data, secret)}`;
}

// Geçersizse null döner (imza bozuk, algoritma farklı, süresi dolmuş, biçim hatalı)
export function verifyToken(token, secret) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;

  const expected = Buffer.from(sign(`${h}.${p}`, secret));
  const given = Buffer.from(s);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const header = JSON.parse(Buffer.from(h, 'base64url').toString());
    if (header.alg !== 'HS256') return null; // "alg: none" saldırısına karşı
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
