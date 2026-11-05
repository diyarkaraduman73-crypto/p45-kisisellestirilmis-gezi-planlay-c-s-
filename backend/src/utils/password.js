// Parolalar veritabanına ASLA düz metin yazılmaz; tuzlu (salted) scrypt özeti saklanır.
// Biçim: scrypt$<tuz-hex>$<özet-hex>
// - Tuz: her kullanıcı için rastgele 16 bayt. Aynı parolaya sahip iki kullanıcının özeti farklı olur;
//   önceden hesaplanmış "rainbow table" saldırıları işe yaramaz.
// - scrypt: kasıtlı olarak yavaş ve bellek harcayan bir algoritma; kaba kuvvet denemesini pahalı kılar.
//   (bcrypt / argon2 ile aynı amaçlı; Node'da ek paket gerektirmeden yerleşik geldiği için seçildi.)
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEYLEN = 32;

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [algo, saltHex, hashHex] = String(stored).split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const hash = scryptSync(String(password), Buffer.from(saltHex, 'hex'), KEYLEN);
  const expected = Buffer.from(hashHex, 'hex');
  // Sabit süreli karşılaştırma: zamanlama farkından bilgi sızmaz
  return expected.length === hash.length && timingSafeEqual(hash, expected);
}

// Olmayan bir e-postayla girişte de aynı süre harcansın diye kullanılan sahte özet
// (yanıt süresinden "bu e-posta kayıtlı mı" bilgisi çıkarılamasın).
export const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'));

// Parola politikası: en az 8 karakter, en az bir harf ve bir rakam
export function passwordProblem(password) {
  const p = String(password ?? '');
  if (p.length < 8) return 'Parola en az 8 karakter olmalı';
  if (p.length > 128) return 'Parola en fazla 128 karakter olabilir';
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p) || !/\d/.test(p)) return 'Parola en az bir harf ve bir rakam içermeli';
  return null;
}
