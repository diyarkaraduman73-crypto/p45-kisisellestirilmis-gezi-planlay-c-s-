# Hafta 4 · Veritabanı Tasarımı ve Veri Erişim Katmanı

**Amaç:** Veritabanı şemasını oluşturmak, ilişkileri kurmak ve temel veri erişim katmanını yazmak.
**Modül:** Veritabanı ve veri erişim katmanı

## Yapılanlar

- [x] **Migration sistemi:** `backend/db/migrations/` + `npm run db:migrate` (her dosya transaction içinde, `schema_migrations` tablosunda takip edilir, ikinci kez çalışmaz)
  - `001_create_tables.sql` — 9 tablo, PK/FK, UNIQUE, CHECK, NOT NULL kısıtları
  - `002_indexes.sql` — yabancı anahtar ve sık sorgulanan sütunlara 7 indeks
  - `003_updated_at_and_checks.sql` — mevcut tabloyu değiştiren (ALTER) örnek: `trips.updated_at` + tetikleyici, e-posta biçim kısıtı
- [x] **Sentetik veri:** `npm run db:seed` → 1 şehir, 7 ilgi alanı, 22 POI, 12 sahte kullanıcı, 12 rota (gün planları ve duraklarıyla)
- [x] **CRUD veri erişim fonksiyonları:** `backend/src/repositories/` (kullanıcı, rota, POI, şehir, ilgi)
- [x] **Transaction:** kullanıcı + tercih + ilgiler, rota + günler + duraklar tek işlemde (`withTransaction`)
- [x] **API uçları:** `/api/users`, `/api/trips`, `/api/pois` için tam CRUD
- [x] Şifreler scrypt ile özetleniyor; özet hiçbir yanıtta dönmüyor
- [x] Veritabanı kısıt hataları anlaşılır HTTP yanıtlarına çevriliyor (409 / 400)

## Teslim edilen çıktılar

| Çıktı | Yer |
|---|---|
| Veritabanı şeması / scriptleri | `backend/db/migrations/*.sql`, tam döküm: `backend/db/schema.sql` |
| Örnek veriyle dolu veritabanı | `npm run db:setup` (migrate + seed) |
| CRUD veri erişim kodu | `backend/src/repositories/*.js` |
| Örnek sorgular | `backend/db/ornek-sorgular.sql` |

## Test sonuçları

Gerçek PostgreSQL 16 üzerinde 29 test çalıştırıldı, hepsi geçti. Öne çıkanlar:

| Test | Sonuç |
|---|---|
| Kullanıcı / POI / rota için CREATE, READ, UPDATE, DELETE | ✔ |
| Aynı e-posta ikinci kez → 409 (UNIQUE) | ✔ |
| Olmayan POI içeren rota → FK hatası, **ROLLBACK ile yarım rota kalmıyor** | ✔ |
| Planda kullanılan POI silinemiyor (FK kısıtı) → 409 | ✔ |
| Kullanıcı silinince rotaları, ilgileri, tercihleri CASCADE ile siliniyor | ✔ |
| `price_level = 9`, büyük harfli e-posta → CHECK kısıtı reddediyor | ✔ |
| Rota güncellenince `updated_at` tetikleyiciyle değişiyor | ✔ |
| Migration'ları ikinci kez çalıştırmak bir şey bozmuyor | ✔ |
| `WHERE lower(name) LIKE 'gal%'` → `Index Scan using idx_pois_name_lower` | ✔ |

## Gösterilecek ilerleme (demo adımları)

1. Neon'da ücretsiz veritabanı aç, bağlantı adresini `backend/.env` → `DATABASE_URL` içine yaz.
2. `cd backend && npm install && npm run db:setup` → migration'lar ve sentetik veri yüklenir.
3. Neon'un SQL Editor'ünde (veya `psql`) `db/ornek-sorgular.sql` içindeki sorguları çalıştır: N-N JOIN, gün gün rota, en popüler POI'ler, EXPLAIN ile indeks kullanımı, transaction/ROLLBACK.
4. `npm run dev` → API ile CRUD:

```bash
# Kullanıcı oluştur
curl -X POST localhost:4000/api/users -H "Content-Type: application/json" \
  -d '{"fullName":"Demo Gezgin","email":"demo@example.com","password":"Deneme1234!","interests":["tarih","yemek"],"preferences":{"budget":"orta","pace":"normal"}}'

# Rota oluştur (gün planı + duraklarla, tek transaction)
curl -X POST localhost:4000/api/trips -H "Content-Type: application/json" \
  -d '{"userId":13,"city":"İstanbul","title":"Hafta sonu","dayCount":2,"days":[{"dayNumber":1,"items":[{"poiId":1,"startTime":"09:00"},{"poiId":2}]},{"dayNumber":2,"items":[{"poiId":8}]}]}'

curl localhost:4000/api/trips/13                          # oku
curl -X PATCH localhost:4000/api/trips/13 -H "Content-Type: application/json" -d '{"title":"Uzun hafta sonu"}'
curl -X DELETE localhost:4000/api/trips/13                # sil
```

## API

| Metot | Yol | İşlem |
|---|---|---|
| GET / POST | `/api/users` | Listele (sayfalı) / oluştur |
| GET / PATCH / DELETE | `/api/users/:id` | Oku / güncelle / sil |
| GET | `/api/users/:id/trips` | Kullanıcının rotaları |
| POST | `/api/trips` | Rota + günler + duraklar oluştur |
| GET / PATCH / DELETE | `/api/trips/:id` | Oku / güncelle / sil |
| GET | `/api/trips/shared/:code` | Paylaşım koduyla oku |
| GET / POST | `/api/pois` | Listele (`city`, `interests`, `q` filtreli) / oluştur |
| GET / PATCH / DELETE | `/api/pois/:id` | Oku / güncelle / sil |
| GET | `/api/cities`, `/api/interests` | Referans listeleri |

## KVKK ve sentetik veri

- Kişiler gerçek değil: adlar `Deneme Kullanıcı 01…12`, e-postalar `kullaniciNN@example.com` (`example.com` test için ayrılmış alan adıdır, gerçek kimseye ait değildir).
- Herkesin şifresi aynı sahte değerdir (`Deneme1234!`) ve veritabanında yalnızca özeti durur.
- Veriler sabit tohumlu bir sayı üreteciyle üretilir; her çalıştırmada aynı sonuç çıkar.
- POI'ler herkese açık turistik mekânlardır, kişisel veri içermez.

## Yapay zekâ kullanımı

Yapay zekâ SQL şemasını ve sorguları gözden geçirmek, indeks önerisi almak ve migration örneklerini incelemek için kullanıldı. Kontrol ederek alınan kararlar: PostgreSQL'in yabancı anahtarlara otomatik indeks eklemediği doğrulandı ve indeksler `002_indexes.sql`'e eklendi; `(trip_id, day_number)` gibi UNIQUE kısıtlar zaten indeks oluşturduğu için ayrıca indeks eklenmedi; önerilen indekslerin gerçekten kullanıldığı `EXPLAIN` ile kontrol edildi.

## Öğrencinin kendi geliştireceği bölümler

> Sözlü sınavda bunları kendin açıklayabilmelisin.

- **Şemayı ER modeline göre kurmak:** `001_create_tables.sql`'deki her tabloyu Hafta 3 ER diyagramıyla karşılaştır; her FK hangi ilişkiyi temsil ediyor, söyleyebilmelisin.
- **En az bir ilişki ve kısıtı elle yazıp açıklamak:** Önerim: `004_poi_opening_hours.sql` adıyla yeni bir migration yaz. POI ile 1-N ilişkili `poi_opening_hours (id, poi_id FK, weekday 0-6, opens_at, closes_at)` tablosu; `CHECK (closes_at > opens_at)`, `UNIQUE (poi_id, weekday)` ve `ON DELETE CASCADE` ekle. Sonra `npm run db:migrate` ile uygula ve neden bu kısıtları seçtiğini açıkla.

## Sözlü sınav hazırlığı

**1) Bir tabloya neden indeks ekledin/eklemedin?**
İndeks, WHERE / JOIN / ORDER BY'da sık kullanılan sütunlarda tam tablo taramasını önler. PostgreSQL PK ve UNIQUE için indeksi kendisi kurar ama **yabancı anahtar sütunlarına kurmaz**; bu yüzden `pois.interest_id`, `trips.user_id`, `day_plan_items.poi_id` gibi FK'lere indeks ekledim (JOIN'ler ve `ON DELETE CASCADE` hızlanır). `pois(city_id, interest_id)` bileşik indeksi katalog filtresi içindir. `day_plans.trip_id`'ye ayrıca indeks eklemedim çünkü `UNIQUE(trip_id, day_number)` zaten trip_id ile başlayan bir indeks. Her indeks INSERT/UPDATE'i yavaşlattığı ve yer kapladığı için "her sütuna indeks" de yanlış olur.

**2) Yabancı anahtar kısıtı ne işe yarar?**
Referans bütünlüğünü sağlar: olmayan bir kayda başvuru eklenemez (olmayan POI'yi plana eklemek 23503 hatası verir) ve başvurulan kayıt habersizce silinemez (planda kullanılan POI silinemiyor). `ON DELETE CASCADE` ile bağımlı kayıtların otomatik silinmesini de tanımlar (kullanıcı silinince rotaları).

**3) N-N ilişkiyi nasıl modelledin?**
Ara tablo ile. Kullanıcı ↔ İlgi için `user_interests(user_id FK, interest_id FK)` ve bileşik PK `(user_id, interest_id)` — aynı ilgi iki kez eklenemez. Gün planı ↔ POI için `day_plan_items`; burada ilişkinin kendine ait bilgileri de var (sıra, saat, not), o yüzden ayrı `id` ve `UNIQUE(day_plan_id, visit_order)` kullandım.

**4) Migration neden kullanılır?**
Şemadaki her değişikliği sıralı, sürüm kontrolüne giren dosyalar olarak tutar. Böylece Neon'daki üretim veritabanı, yereldeki veritabanı ve takım arkadaşının veritabanı aynı komutla (`npm run db:migrate`) aynı şemaya gelir; hangi değişikliğin ne zaman yapıldığı `schema_migrations`'ta görülür. Her migration transaction içinde çalıştığı için yarıda kalan değişiklik olmaz. Örnek: 003 numaralı migration mevcut `trips` tablosuna veri kaybetmeden yeni sütun ekledi.

**5) Bir CRUD işleminin SQL'ini açıkla.** (Örnek: rota oluşturma, `tripRepository.create`)
```sql
BEGIN;
INSERT INTO trips (user_id, city_id, title, start_date, day_count, share_code)
VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;            -- yeni rotanın id'si
INSERT INTO day_plans (trip_id, day_number, summary)
VALUES ($1, $2, $3) RETURNING id;                        -- her gün için
INSERT INTO day_plan_items (day_plan_id, poi_id, visit_order, start_time, note)
VALUES ($1, $2, $3, $4, $5);                             -- her durak için
COMMIT;   -- herhangi biri hata verirse ROLLBACK
```
`$1, $2…` parametreli sorgudur: değerler SQL metnine yapıştırılmaz, sürücü ayrı gönderir; bu **SQL enjeksiyonunu** önler. `RETURNING id` ek bir SELECT'e gerek bırakmadan oluşan kimliği verir.

## Teorik kavramlar (kısa)

- **DDL** (Data Definition Language): yapıyı tanımlar — `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, `DROP`. Migration dosyalarımız DDL'dir.
- **DML** (Data Manipulation Language): veriyi işler — `SELECT`, `INSERT`, `UPDATE`, `DELETE`. Repository'lerimiz DML'dir.
- **İndeks:** Sütun değerlerinden satırlara hızlı erişim sağlayan ek yapı (B-tree). Okumayı hızlandırır, yazmayı biraz yavaşlatır.
- **Referans bütünlüğü:** FK'nin işaret ettiği kaydın her zaman var olması garantisi.
- **Transaction (ACID):** Birden çok işlemin ya hepsinin ya hiçbirinin uygulanması (Atomicity); kısıtların her zaman sağlanması (Consistency); eş zamanlı işlemlerin birbirini bozmaması (Isolation); COMMIT edilenin kalıcı olması (Durability).

## ORM mi saf SQL mi?

Saf SQL (`pg` + parametreli sorgular) seçildi. Gerekçe: dersin amacı SQL'i, JOIN'leri ve indeks etkisini görmek; sorgular doğrudan `EXPLAIN` ile incelenebiliyor; ek bağımlılık yok. Dezavantajı: daha fazla tekrar eden kod ve elle eşleme. Alternatifler: Prisma / Sequelize / Drizzle (ORM; tip güvenliği ve otomatik migration sağlar ama üretilen SQL'i gizler). Katmanlı mimari sayesinde ileride ORM'e geçmek yalnızca `repositories/` klasörünü etkiler.

## Sık yapılan hatalar ve alınan önlem

| Hata | Önlem |
|---|---|
| İlişkisiz / denormalize tablolar | 3NF şema, tüm ilişkiler FK ile |
| Kısıt tanımlamamak | NOT NULL, UNIQUE, CHECK, FK + ON DELETE davranışı her tabloda |
| Gerçek kişisel veri kullanmak | Yalnızca sentetik kullanıcılar, `example.com` e-postaları |
