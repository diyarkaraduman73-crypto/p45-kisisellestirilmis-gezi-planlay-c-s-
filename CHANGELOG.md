# Değişiklik Günlüğü

Bu projede [anlamsal sürümleme](https://semver.org/lang/tr/) (MAJOR.MINOR.PATCH) kullanılır:

- **MAJOR** — geriye uyumsuz API değişikliği. Proje henüz `0.x` olduğu için API'nin kararlı olduğu sözü verilmez.
- **MINOR** — geriye uyumlu yeni özellik (ör. yeni modül, yeni uç).
- **PATCH** — yalnızca hata düzeltmesi.

Her sürüm Git'te `vX.Y.Z` etiketiyle işaretlenir. Çalışan sürüm `GET /api/health` yanıtındaki `version` alanında ve arayüzün üst çubuğunda görünür.

## [0.9.0] — 2026-11-26 · Harita entegrasyonu (Hafta 9)

### Eklendi
- Duraklar arasında gerçek yürüme yolu: openrouteservice (HeiGIT) Directions API, `ORS_API_KEY` ile.
- Uçlar: `GET /api/trips/:id/days/:day/path`, `GET /api/trips/shared/:code/days/:day/path`, `POST /api/routing/path`.
- Harici istekler için ortak istemci: zaman aşımı, yeniden deneme, 429/`Retry-After`, hata sınıflandırma.
- Hız sınırı (dışarıya 30/dk, uçlarımızda kullanıcı/IP başına 60/dk) ve 24 saatlik yol önbelleği.
- `/api/health` → `services.harita`.

### Değişti
- Haritada yürüyüş bacakları düz, toplu taşıma bacakları kesikli çizgi; servis yoksa düz çizgi + neden notu.

 — 2026-11-26 · Ara sürüm (vize)

İlk etiketli sürüm. Kullanıcı yönetimi + veritabanı + iki çekirdek modül uçtan uca birlikte çalışıyor.

### Eklendi
- `GET /api/health` yanıtına `version` alanı.
- Arayüzde sürüm rozeti: arayüz ve API sürümü farklıysa uyarır (ör. Vercel güncellendi ama Render eski sürümde).
- Testler: `npm test` (birim: planlayıcı + doğrulama), `npm run test:entegrasyon` (çalışan API'ye karşı uçtan uca senaryo).
- [Demo senaryosu](docs/demo-senaryosu.md).

### Düzeltildi
- **Tarih bir gün önce görünüyordu.** PostgreSQL `DATE` değerleri yerel saatle `Date` nesnesine çevrilip JSON'da UTC'ye kayıyordu; UTC+3'te 26 Kasım, 25 Kasım görünüyordu. Artık `YYYY-AA-GG` metni olarak döndürülüyor.
- **Takvimde olmayan tarih 500 veriyordu.** `2026-02-30` doğrulamadan geçip veritabanında reddediliyordu. Artık 400 ve anlaşılır mesaj.
- PostgreSQL biçim/aralık hataları (`22007`, `22008`, `22P02`, `22003`) 500 yerine 400 döndürüyor.

### Önceki haftalar (etiketlenmemiş)
| Hafta | Kapsam |
|---|---|
| 7 | Rota ve Gün Planı Üretimi, kaydet/paylaş (migration 006) |
| 6 | POI kataloğu ve ilgi profili (migration 005) |
| 5 | Kayıt/giriş, roller, oturumlar (migration 004) |
| 4 | Veritabanı şeması, migration ve seed betikleri (001–003) |
| 3 | Proje iskeleti, mimari, veri modeli |
