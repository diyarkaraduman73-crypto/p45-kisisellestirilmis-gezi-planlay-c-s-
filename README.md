# 🧭 P45 · Kişiselleştirilmiş Gezi Planlayıcı

**Öğrenci:** Diyar Karaduman · **Numara:** 251161035

İlgi alanına, süresine ve konumuna göre **gün gün kişiselleştirilmiş gezi rotası** üreten web uygulaması.

| | |
|---|---|
| **Problem** | Gezginler ilgi alanlarına uygun, zaman ve konuma göre optimize rota oluşturmakta zorlanıyor. |
| **Hedef kullanıcı** | Yerli ve yabancı gezginler |
| **Temel modüller** | İlgi/tercih profili · POI kataloğu · Rota üretimi · Harita/gün planı · Kaydet/paylaş · Öneri |
| **Yapay zekâ** | Tercih ve süreye göre gün gün gezi planı ve yerel öneriler |

## Teknolojiler

| Katman | Teknoloji | Ücretsiz yayın |
|---|---|---|
| Frontend | React 18 + Vite, Leaflet + OpenStreetMap | Vercel |
| Backend | Node.js + Express (REST API) | Render |
| Veritabanı | PostgreSQL | Neon |
| Yapay zekâ | Groq LLM API (ileriki haftalar) | Groq Free |

## Klasör yapısı

```
├── frontend/                 React arayüzü (Vercel'de yayınlanır)
│   └── src/
│       ├── pages/            Sayfalar (Keşfet, Planla, Rota, Paylaşım, Giriş, Kayıt, Profilim, Rotalarım, Yönetim)
│       ├── auth/             Oturum durumu (AuthContext)
│       ├── components/       Tekrar kullanılabilir bileşenler (form, harita)
│       └── services/         Backend API istemcisi
├── backend/                  REST API (Render'da yayınlanır)
│   ├── db/migrations/        Sıralı şema değişiklikleri (001_, 002_, ...)
│   ├── db/schema.sql         Güncel şemanın tam dökümü (otomatik üretilir)
│   ├── db/ornek-sorgular.sql Demo sorguları (JOIN, EXPLAIN, transaction)
│   ├── scripts/              migrate.js, seed.js (sentetik veri)
│   └── src/
│       ├── routes/           SUNUM: URL eşlemeleri
│       ├── controllers/      SUNUM: istek/yanıt
│       ├── services/         İŞ: kurallar, doğrulama
│       ├── repositories/     VERİ: SQL erişimi
│       ├── middleware/       Kimlik doğrulama, rol kontrolü, güvenlik başlıkları, hata yönetimi
│       ├── utils/            Doğrulama, şifre özetleme, hata sınıfları
│       ├── config/           Veritabanı bağlantısı
│       └── data/seed.js      Başlangıç verisi
└── docs/                     Mimari, ER diyagramı, güvenlik notu, modül açıklamaları, haftalık raporlar
```

Ayrıntılar: [Mimari şema](docs/mimari.md) · [ER diyagramı ve veri modeli](docs/veri-modeli.md) · [Güvenlik notu](docs/guvenlik-notu.md)

## Yerelde çalıştırma

Gereksinim: Node.js 18 veya üzeri.

```bash
# 1) Backend
cd backend
cp .env.example .env        # DATABASE_URL ve JWT_SECRET'ı doldurun
npm install
npm run dev                 # http://localhost:4000/api/health

# 2) Frontend (yeni terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Veritabanı ile çalışmak için Neon'da ücretsiz proje açın, bağlantı adresini `backend/.env` içindeki `DATABASE_URL`'e yazın ve `npm run db:setup` çalıştırın (migration'lar + sentetik örnek veri).

### Veritabanı komutları (backend klasöründe)

| Komut | Ne yapar |
|---|---|
| `npm run db:migrate` | Henüz uygulanmamış migration'ları sırayla uygular |
| `npm run db:seed` | Sentetik örnek veriyi yükler (`-- --reset` ile önce tabloları boşaltır) |
| `npm run db:setup` | İkisini birlikte çalıştırır |

## Demo hesaplar

`npm run db:seed` sonrası (hepsi sentetik, parola: `Deneme1234!`):

| Rol | E-posta |
|---|---|
| Yönetici | `yonetici@example.com` |
| Gezgin | `kullanici01@example.com` … `kullanici12@example.com` |

## API

🔓 herkese açık · 🔑 giriş gerekli · 👤 kendisi veya yönetici · 🛡️ yalnızca yönetici

| Metot | Yol | Erişim | Açıklama |
|---|---|---|---|
| GET | `/api/health`, `/api/interests`, `/api/cities` | 🔓 | Durum ve referans listeleri |
| POST | `/api/auth/register`, `/api/auth/login` | 🔓 | Kayıt / giriş → `{ token, user }` |
| POST | `/api/auth/logout` | 🔑 | Oturumu sonlandırır |
| GET | `/api/auth/me` | 🔑 | Giriş yapan kullanıcı |
| POST | `/api/auth/password` | 🔑 | Parola değiştirir, diğer oturumları kapatır |
| GET | `/api/pois`, `/api/pois/:id` | 🔓 | POI kataloğu: `city`, `interests`, `tags`, `q`, `priceMax`, `lat`+`lng`+`radiusKm` |
| GET | `/api/pois/for-me` | 🔑 | İlgi profiline göre puanlı ve gerekçeli liste |
| POST / PATCH / DELETE | `/api/pois`, `/api/pois/:id` | 🛡️ | POI yönetimi (kullanılan POI silinmez, pasifleştirilir) |
| GET | `/api/tags` | 🔓 | Etiketler |
| POST / DELETE | `/api/tags`, `/api/tags/:slug` | 🛡️ | Etiket yönetimi |
| GET / PUT | `/api/profile` | 🔑 | Kendi ilgi profilim (ilgi düzeyi 1–5, bütçe, tempo) |
| GET / POST | `/api/users` | 🛡️ | Kullanıcı listesi / kullanıcı ekleme |
| GET / PATCH / DELETE | `/api/users/:id` | 👤 | Profil (tercih ve ilgileriyle) |
| PATCH | `/api/users/:id/role` | 🛡️ | Rol değiştirme |
| GET | `/api/users/:id/trips` | 👤 | Kullanıcının rotaları |
| POST | `/api/trips/plan` | 🔑 | Gün gün rota **önizlemesi** (ilgi profili + süre/mesafe kısıtları) |
| POST | `/api/trips/generate` | 🔑 | Rota üret ve kaydet |
| POST | `/api/trips` | 🔑 | Elle rota (giriş yapan adına) |
| GET / PATCH / DELETE | `/api/trips/:id` | 👤 | Rota (sahibi veya yönetici) |
| POST | `/api/trips/:id/share` | 👤 | Paylaşımı aç/kapat, bağlantıyı yenile |
| GET | `/api/trips/shared/:code` | 🔓 | Paylaşılan rota (yalnızca paylaşım açıksa) |

Korumalı uçlara `Authorization: Bearer <token>` başlığıyla istek atılır. Ayrıntılar: [Güvenlik notu](docs/guvenlik-notu.md)

## Ücretsiz yayınlama

1. **Neon:** Proje oluştur → bağlantı adresini kopyala → yerelde `npm run db:setup`.
2. **Render:** New → Web Service → bu depo → *Root Directory* `backend`, *Build* `npm install`, *Start* `npm start`, plan **Free**. Ortam değişkenleri: `DATABASE_URL`, `CORS_ORIGIN` (Vercel adresin), `JWT_SECRET` (en az 32 karakter rastgele), `NODE_ENV=production`.
3. **Vercel:** New Project → bu depo → *Root Directory* `frontend` (Vite otomatik algılanır). Ortam değişkeni: `VITE_API_URL` = Render adresin.

> Render ücretsiz servisi 15 dk boşta kalınca uyur; ilk istek yaklaşık 1 dakika sürebilir. Sunumdan önce siteyi bir kez açın.

## Haftalık ilerleme

| Hafta | Konu | Rapor |
|---|---|---|
| 3 | Kurulum, mimari ve veri modeli | [rapor](docs/haftalar/hafta-3/rapor.md) · [yapay zekâ günlüğü](docs/haftalar/hafta-3/yapay-zeka-gunlugu.md) |
| 4 | Veritabanı tasarımı ve veri erişim katmanı | [rapor](docs/haftalar/hafta-4/rapor.md) · [yapay zekâ günlüğü](docs/haftalar/hafta-4/yapay-zeka-gunlugu.md) |
| 5 | Kullanıcı yönetimi ve kimlik doğrulama | [rapor](docs/haftalar/hafta-5/rapor.md) · [yapay zekâ günlüğü](docs/haftalar/hafta-5/yapay-zeka-gunlugu.md) |
| 6 | Çekirdek Modül A: POI Kataloğu ve İlgi Profili | [rapor](docs/haftalar/hafta-6/rapor.md) · [yapay zekâ günlüğü](docs/haftalar/hafta-6/yapay-zeka-gunlugu.md) · [modül açıklaması](docs/moduller/poi-katalogu-ilgi-profili.md) |
| 7 | Çekirdek Modül B: Rota ve Gün Planı Üretimi | [rapor](docs/haftalar/hafta-7/rapor.md) · [yapay zekâ günlüğü](docs/haftalar/hafta-7/yapay-zeka-gunlugu.md) · [modül açıklaması](docs/moduller/rota-gun-plani.md) |

Her haftanın raporu ve yapay zekâ kullanım günlüğü `docs/haftalar/hafta-N/` klasöründedir. Güncel kod `main` dalındadır; her haftanın teslim edilen son hali ayrıca `hafta-N` dalında saklanır.
