export function notFound(_req, res) {
  res.status(404).json({ error: 'Bulunamadı' });
}

// PostgreSQL kısıt ihlallerini anlaşılır HTTP yanıtlarına çevirir.
const PG_ERRORS = {
  23505: [409, 'Bu kayıt zaten var (benzersizlik kısıtı)'],
  23503: [409, 'İlişkili kayıt bulunamadı veya kayıt başka bir yerde kullanılıyor (yabancı anahtar kısıtı)'],
  23514: [400, 'Değer izin verilen aralıkta değil (CHECK kısıtı)'],
  23502: [400, 'Zorunlu alan boş bırakılamaz (NOT NULL kısıtı)'],
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Geçersiz JSON' });
  if (PG_ERRORS[err.code]) {
    const [status, message] = PG_ERRORS[err.code];
    return res.status(status).json({ error: message });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && status !== 503 ? 'Sunucu hatası' : err.message });
}
