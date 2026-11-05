// Temel HTTP güvenlik başlıkları (helmet paketinin küçük bir karşılığı)
export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');          // MIME türü tahminini kapat
  res.setHeader('X-Frame-Options', 'DENY');                    // clickjacking: iframe içine alınamaz
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');                  // API yanıtları (token içerebilir) önbelleğe alınmaz
  res.removeHeader('X-Powered-By');
  next();
}
