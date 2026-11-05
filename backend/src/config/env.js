// Ortam değişkenlerinden okunan güvenlik ayarları.
import { randomBytes } from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

let secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  if (isProd) {
    throw new Error('JWT_SECRET en az 32 karakter olmalı. Render > Environment kısmına ekleyin.');
  }
  // Geliştirmede rastgele anahtar: sunucu her yeniden başladığında tüm oturumlar düşer.
  secret = randomBytes(48).toString('hex');
  console.warn('⚠ JWT_SECRET tanımlı değil; geçici rastgele anahtar kullanılıyor (yalnızca geliştirme).');
}

export const config = {
  isProd,
  jwtSecret: secret,
  sessionTtlMinutes: Number(process.env.SESSION_TTL_MINUTES) || 120, // oturum süresi
  maxFailedLogins: 5,        // bu kadar hatalı denemeden sonra...
  lockMinutes: 15,           // ...hesap bu süre kilitlenir
};
