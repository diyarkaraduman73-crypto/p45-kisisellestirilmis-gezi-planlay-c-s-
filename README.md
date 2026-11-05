# 🧭 P45 · Kişiselleştirilmiş Gezi Planlayıcı

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
│       ├── pages/            Sayfalar
│       ├── components/       Tekrar kullanılabilir bileşenler (form, harita)
│       └── services/         Backend API istemcisi
├── backend/                  REST API (Render'da yayınlanır)
│   ├── db/schema.sql         Veritabanı şeması (3NF)
│   ├── scripts/initDb.js     Tabloları oluşturur + örnek veri yükler
│   └── src/
│       ├── routes/           SUNUM: URL eşlemeleri
│       ├── controllers/      SUNUM: istek/yanıt
│       ├── services/         İŞ: kurallar, doğrulama
│       ├── repositories/     VERİ: SQL erişimi
│       ├── middleware/       Hata yönetimi
│       ├── config/           Veritabanı bağlantısı
│       └── data/seed.js      Başlangıç verisi
└── docs/                     Mimari, ER diyagramı, haftalık raporlar
```

Ayrıntılar: [Mimari şema](docs/mimari.md) · [ER diyagramı ve veri modeli](docs/veri-modeli.md)

## Yerelde çalıştırma

Gereksinim: Node.js 18 veya üzeri.

```bash
# 1) Backend
cd backend
cp .env.example .env        # DATABASE_URL boş kalırsa örnek verilerle çalışır
npm install
npm run dev                 # http://localhost:4000/api/health

# 2) Frontend (yeni terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Veritabanı ile çalışmak için Neon'da ücretsiz proje açın, bağlantı adresini `backend/.env` içindeki `DATABASE_URL`'e yazın ve `npm run db:init` çalıştırın.

## API (şu anki)

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/api/health` | Sunucu ve veritabanı durumu |
| GET | `/api/interests` | İlgi alanı listesi |
| GET | `/api/pois?city=İstanbul&interests=tarih,doga` | POI kataloğu (filtreli) |
| GET | `/api/pois/:id` | Tek POI |

## Ücretsiz yayınlama

1. **Neon:** Proje oluştur → bağlantı adresini kopyala → yerelde `npm run db:init`.
2. **Render:** New → Web Service → bu depo → *Root Directory* `backend`, *Build* `npm install`, *Start* `npm start`, plan **Free**. Ortam değişkenleri: `DATABASE_URL`, `CORS_ORIGIN` (Vercel adresin).
3. **Vercel:** New Project → bu depo → *Root Directory* `frontend` (Vite otomatik algılanır). Ortam değişkeni: `VITE_API_URL` = Render adresin.

> Render ücretsiz servisi 15 dk boşta kalınca uyur; ilk istek yaklaşık 1 dakika sürebilir. Sunumdan önce siteyi bir kez açın.

## Haftalık ilerleme

| Hafta | Konu | Rapor |
|---|---|---|
| 3 | Kurulum, mimari ve veri modeli | [hafta-3.md](docs/haftalar/hafta-3.md) |

Güncel kod `main` dalındadır; her haftanın teslim edilen son hali ayrıca `hafta-N` dalında saklanır.
