# Hafta 6 · Çekirdek Modül A: POI Kataloğu ve İlgi Profili

**Amaç:** İlgi noktaları kataloğu ve kullanıcı ilgi profilini yöneten modülü geliştirmek.
**Modül:** POI Kataloğu ve İlgi Profili — ayrıntılı açıklama: [docs/moduller/poi-katalogu-ilgi-profili.md](../moduller/poi-katalogu-ilgi-profili.md)

## Yapılanlar

- [x] **POI / ilgi modeli:** migration `005` — etiket tabloları, POI'ye ilçe/adres/aktiflik/ekleyen, şehre merkez + yarıçap, ilgi profiline ağırlık (1–5)
- [x] **Kategori / etiket:** kategori = tek ana tür (1-N), etiket = çoklu özellik (N-N); "hepsini taşıyan" etiket filtresi; etiket yönetimi
- [x] **Konum:** Haversine ile yakınlık araması (kutu ön filtresi + indeks), mesafeye göre sıralama; şehir sınırı iş kuralı
- [x] **İş kuralları ve doğrulama:** 8 katalog kuralı (K1–K8), 5 profil kuralı (P1–P5)
- [x] **İlgi profili:** `GET/PUT /api/profile`
- [x] **Entegrasyon:** `GET /api/pois/for-me` (profil + katalog → gerekçeli puan), pasif POI'lerin rota modülüyle uyumu
- [x] **Arayüz:** Keşfet (kategori, etiket, ad, fiyat, yakınımdakiler, "profilime göre sırala"), Profilim (ilgi düzeyi kaydırıcıları), Yönetim → POI ekle/düzenle/etiketle/pasifleştir

## Teslim edilen çıktılar

| Çıktı | Yer |
|---|---|
| Çalışan POI Kataloğu ve İlgi Profili | `backend/src/services/poiService.js`, `profileService.js`, `tagService.js`; arayüzde Keşfet, Profilim, Yönetim |
| İlgili kod | `backend/db/migrations/005_poi_catalog_interest_profile.sql`, `repositories/poiRepository.js`, `tagRepository.js`, `utils/geo.js` |
| Kısa açıklama | [docs/moduller/poi-katalogu-ilgi-profili.md](../moduller/poi-katalogu-ilgi-profili.md) |

## Test sonuçları

Gerçek PostgreSQL üzerinde modül için 42 test çalıştırıldı, hepsi geçti; önceki haftaların kimlik doğrulama testleri (38) de değişmeden geçiyor. Örnekler:

| Senaryo | Sonuç |
|---|---|
| Ayasofya çevresi 1 km → Ayasofya (0), Yerebatan (0.19), Topkapı (0.42), Sultanahmet (0.46), mesafeye göre sıralı | ✔ |
| `tags=bogaz,gun-batimi` → yalnızca ikisini birden taşıyanlar (Ortaköy, Kız Kulesi) | ✔ |
| Aynı şehirde "GÜLHANE parkı" ikinci kez → 409 | ✔ |
| Ankara koordinatıyla İstanbul POI'si → 400 "merkeze 349.1 km uzakta; en fazla 60 km" | ✔ |
| Planda kullanılan POI silinmek istenince → pasifleştirildi, eski rota bozulmadı | ✔ |
| Pasif POI yeni rotaya eklenemiyor | ✔ |
| `includeInactive=1` gezginde yok sayılıyor, yöneticide çalışıyor | ✔ |
| Etiket silinince POI'lerden de kalkıyor, POI'ler duruyor | ✔ |
| Profil: boş liste, tekrar eden ilgi, ağırlık 9, geçersiz bütçe → 400 | ✔ |
| Doğa 5/5 olan kullanıcıda öneri listesinin başı doğa yerleri; düşük bütçede pahalı yer "bütçenin üstünde" gerekçesiyle aşağıda | ✔ |

## Gösterilecek ilerleme (demo adımları)

1. `cd backend && npm run db:migrate && npm run db:seed -- --reset && npm run dev`, `cd frontend && npm run dev`
2. **Katalog (ziyaretçi):** Keşfet'te "Tarih & Müze" + "#Boğaz" seç → liste ve harita daralır. "📍 Yakınımdakiler" → izin ver → yarıçap 3 km, mesafeye göre sıralı liste.
3. **İlgi profili:** `kullanici01@example.com` / `Deneme1234!` ile gir → **Profilim** → Doğa 5, Tarih 2, bütçe Ekonomik → Kaydet → Keşfet'te "İlgi profilime göre sırala" → puan ve gerekçeler görünür.
4. **Yönetici:** `yonetici@example.com` ile gir → Yönetim → yeni POI ekle; Ankara koordinatı (39.92, 32.85) girince kural hatası; aynı adı tekrar girince 409. Ayasofya'yı "Sil" → "gezi planlarında kullanıldığı için pasifleştirildi" → Keşfet'te artık görünmez → "Aktifleştir".

## Yapay zekâ kullanımı

Yapay zekâ bu modülün veri modeli (kategori ile etiketin ayrılması, ağırlığın ara tabloda tutulması) ve doğrulama örnekleri için öneri almak, ayrıca servis kodunu küçük fonksiyonlara bölmek (refaktör) için kullanıldı. Öneriler testlerle doğrulandı; örneğin "ücretsiz" etiketinin `price_level`'dan türetilebildiği için tekrarlı veri olacağı fark edilip etiket listesinden çıkarıldı.

## Öğrencinin kendi geliştireceği bölümler

> Sözlü sınavda bu kısımları kendi cümlelerinle anlatabilmelisin.

- **Modülün çekirdek mantığını kendin yazmak:** `profileService.recommendPois` içindeki puan formülünü kendin değiştir. Örnek: profildeki **tempo** henüz puana etki etmiyor; "sakin" tempoda ziyaret süresi 90 dk'yı aşan yerlere +10, "yoğun" tempoda 60 dk'nın altındakilere +10 ekle ve gerekçesini `reasons`'a yaz.
- **İş kuralları ve doğrulamayı uygulamak:** Yeni bir kural ekle ve testini yaz. Örnek: "Bir POI'de aynı anda hem `#kapali-mekan` hem `#acik-hava` etiketi olamaz" (`poiService.parseTags` içinde), ihlalde 400.

## Sözlü sınav hazırlığı

**1) POI'yi ilgiye nasıl bağladın?**
İki yoldan. (a) Her POI'nin **tek ana kategorisi** var: `pois.interest_id → interests.id` yabancı anahtarı (1-N). Kategori listesi ile kullanıcının seçebildiği ilgi alanları aynı tablo (`interests`), bu yüzden eşleştirme doğrudan: "Tarih & Müze" ilgisi olan kullanıcıya `interest_id`'si tarih olan POI'ler gelir. (b) Kullanıcı tarafında `user_interests (user_id, interest_id, weight)` ara tablosu var; `weight` ne kadar ilgilendiğini (1–5) tutar. Öneri sorgusu bu iki bağlantıyı aynı `interest_id` üzerinden birleştirir.

**2) Kategorileri nasıl belirledin?**
Gezginin "ne tür bir yer" sorusuna verdiği temel cevaplara göre 7 kategori: Tarih & Müze, Doğa & Park, Yeme & İçme, Alışveriş, Sanat & Kültür, Manzara, Dini Yapılar. Kurallarım: birbirini dışlamalı (bir POI'nin tek ana türü olur), az ve anlaşılır olmalı (profil sayfasında hepsi bir ekrana sığar), kullanıcının ilgisiyle doğrudan eşleşebilmeli. Daha ince ayrımlar ve çoklu özellikler kategoriye değil **etiketlere** bırakıldı (#Boğaz, #Gün batımı). Kategoriler `slug` ile tutulur (`tarih`), böylece görünen ad değişse de kod ve URL'ler bozulmaz.

**3) Bu modülün verisini nasıl modelledin?**
`cities` (merkez + yarıçap) → `pois` (1-N); `interests` → `pois` (1-N, ana kategori); `pois` ↔ `tags` (N-N, `poi_tags`, bileşik PK); `users` ↔ `interests` (N-N, `user_interests`, ağırlık ilişkinin niteliği olduğu için ara tabloda). Tekillik ve kurallar veritabanında da var: `UNIQUE (city_id, lower(name))`, `CHECK (weight BETWEEN 1 AND 5)`, etiket slug biçimi `CHECK`. Silme yerine `is_active` ile pasifleştirme, `created_by` ile kaydı kimin eklediği tutuluyor.

**4) Bu modülde hangi iş kuralını neden koydun?**
Örnek K6: *planda kullanılan POI silinmez, pasifleştirilir.* Neden: POI silinirse ya yabancı anahtar silmeyi engeller (kullanıcıya anlamsız bir hata) ya da CASCADE ile kullanıcıların kayıtlı rotalarından durak kaybolur. Pasifleştirme ikisini de çözer: yeni aramalarda görünmez (K7), eski rotalar olduğu gibi kalır. Örnek K4: *koordinat şehrin 60 km çevresinde olmalı* — enlem/boylamı ters yazmak çok yaygın bir hata ve POI'yi denize ya da başka şehre düşürür; kural hatayı kayıt anında, mesafeyi söyleyerek yakalar.

**5) Bu modülü diğer modüllerle nasıl entegre ettin?**
- **Kimlik/rol (H5):** katalog yazma uçları `requireRole('yonetici')`; profil uçları `requireAuth` ve her zaman "giriş yapan kullanıcı" — başka kullanıcının profiline id ile erişim mümkün değil. Yönetici olmayanın `includeInactive` isteği yok sayılır.
- **Rota (H4):** `tripService` rota oluştururken POI'lerin aktif olduğunu kontrol ediyor; eski rotalar pasif durakları `is_active: false` ile gösteriyor.
- **Kayıt (H5):** kayıtta seçilen ilgiler profile ağırlık 3 ile yansıyor.
- **Sonraki modül (rota üretimi):** `/api/pois/for-me` puanı, `visit_minutes` ve `distance_km` gün gün plan üretmenin girdisi olacak.
Hepsi aynı katmanlı yapıda: modül kendi servis/repository dosyalarını ekledi, ortak `middleware/auth.js` ve `utils/` kullanıldı; önceki testler değişmeden geçiyor.

## Teorik kavramlar (kısa)

- **Veri modeli:** Varlıklar, nitelikleri ve ilişkileri; burada kategori 1-N, etiket N-N, ağırlık ilişki niteliği.
- **İş kuralı / doğrulama:** Doğrulama verinin *biçimini* kontrol eder (enlem −90..90); iş kuralı alanın *anlamını* (POI şehrin 60 km içinde olmalı, kullanılan POI silinmez). İkisi de sunucuda; önemlileri ayrıca veritabanı kısıtı.
- **Modülerlik:** Her modül kendi servis/repository dosyalarında; diğer modüller onu yalnızca servis fonksiyonları üzerinden kullanır (`tripService` → `poiRepository.countActive`).

## Sık yapılan hatalar ve alınan önlem

| Hata | Önlem |
|---|---|
| Doğrulamayı atlamak | Her alan sunucuda doğrulanıyor; önemli kurallar DB kısıtı olarak da var |
| Erişim/sahiplik kontrolünü unutmak | Yazma uçları yalnızca yönetici; profil yalnızca "ben"; `includeInactive` yalnızca yöneticide |
| İlişkili kayıtları yönetmemek | Kullanılan POI pasifleştiriliyor; etiket silinince `poi_tags` CASCADE; POI'yi ekleyen kullanıcı silinirse `created_by` NULL olur (SET NULL) |
