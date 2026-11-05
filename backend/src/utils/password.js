// Şifreler veritabanına asla düz metin olarak yazılmaz; tuzlu scrypt özeti saklanır.
// Biçim: scrypt$<tuz-hex>$<özet-hex>
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [algo, saltHex, hashHex] = String(stored).split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const hash = scryptSync(password, Buffer.from(saltHex, 'hex'), 32);
  return timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}
