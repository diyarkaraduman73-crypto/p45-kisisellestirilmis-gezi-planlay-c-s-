# Hafta 7 · Çekirdek Modül B: Rota ve Gün Planı Üretimi + Entegrasyon

**Amaç:** İlgi ve süreye göre gün planı üreten modülü geliştirmek.
**Modül:** Rota ve Gün Planı Üretimi — ayrıntılı açıklama: [docs/moduller/rota-gun-plani.md](../moduller/rota-gun-plani.md)

## Yapılanlar

- [x] **Rota/plan mantığı:** `planner.js` — çapa ile bölgeleme, açgözlü seçim, 2-opt sıralama, saatli zaman çizelgesi, öğle arası
- [x] **Süre/mesafe kısıtı:** gün penceresi, tempoya göre günlük durak ve km sınırı, duraklar arası tampon, yürüyüş/toplu taşıma süre tahmini
- [x] **Kaydet/paylaş:** önizleme → kaydet (sunucuda yeniden üretim), paylaşımı aç/kapat, bağlantıyı yenile, herkese açık salt okunur sayfa
- [x] **İş kuralları:** R1–R11
- [x] **Entegrasyon:** Modül A (profil + katalog), kimlik/sahiplik, pasif POI'ler
- [x] **Arayüz:** Planla sayfası, rota detayı (gün sekmeleri, zaman çizelgesi, gün renkli harita), paylaşım ayarı, Rotalarım kartları
- [x] Migration `006`, seed'de paylaşıma açık demo rota (`#/paylasim/demo011`)

## Teslim edilen çıktılar

| Çıktı | Yer |
|---|---|
| Çalışan Rota ve Gün Planı Üretimi | `backend/src/services/planner.js`, `routePlanService.js`; arayüzde **Planla** |
| İlgili kod | `tripService.js` (paylaşım), `tripRepository.js`, migration `006`, `frontend/src/pages/PlannerPage.jsx`, `TripDetailPage.jsx`, `SharedTripPage.jsx`, `components/RouteMap.jsx`, `DayTimeline.jsx` |
| Kısa açıklama | [docs/moduller/rota-gun-plani.md](../moduller/rota-gun-plani.md) |

## Test sonuçları

Bu modül için 46 test (algoritma birim testleri + gerçek PostgreSQL ile servis testleri) çalıştırıldı, hepsi geçti. Önceki haftaların testleri de geçiyor (H5: 38, H6: 42).

| Senaryo | Sonuç |
|---|---|
| 72 parametre bileşiminde bağımsız doğrulayıcı: pencere dışı durak, durak/km sınırı aşımı, tekrar eden POI, yol süresiyle çakışma | ihlal yok ✔ |
| Aynı girdi farklı sırada verilse de aynı plan (deterministik) | ✔ |
| Sakin 3, yoğun 6 durak; 3 saatlik pencerede son durak 12:10'da bitiyor; 3 km sınırında 1,72 km | ✔ |
| Günler bölgesel: gün içi en uzak iki durak 2,1 / 4,1 km | ✔ |
| Düşük puanlı ama "mutlaka" seçilen Emirgan plana alındı; sığmayacak şekilde kısıtlanınca gerekçesiyle raporlandı | ✔ |
| Öğle arası hiçbir ziyaretle çakışmıyor | ✔ |
| 2-opt zikzak rotayı 26,3 km'den 10,3 km'ye indirdi | ✔ |
| R1–R8 ihlalleri (8 gün, 05:00, 2 saatlik pencere, Ankara başlangıç, 11 zorunlu, hem zorunlu hem hariç…) → 400 | ✔ |
| Kaydedilen plan, kayıttan hemen önceki önizlemeyle birebir aynı (R9) | ✔ |
| Yeni rota paylaşıma kapalı; başkası açamaz (403); bağlantı yenilenince/kapatılınca eski link 404 | ✔ |
| Paylaşılan sayfada sahip kimliği ve başlangıç (otel) konumu yok | ✔ |
| Rotadaki POI silinmek istenince pasifleşiyor, kayıtlı rota bozulmuyor | ✔ |

## Gösterilecek ilerleme (demo adımları)

1. `cd backend && npm run db:migrate && npm run db:seed -- --reset && npm run dev`; `cd frontend && npm run dev`
2. `kullanici01@example.com` / `Deneme1234!` ile gir → **Profilim**: Tarih 5, Manzara 4, Doğa 2.
3. **Planla**: 2 gün, 09:00–19:00, Normal tempo, "Bir yerden" → Galata Kulesi, "mutlaka" → Emirgan Korusu → **Plan üret**.
   - Gün sekmelerinde saatli plan, yol süreleri, öğle arası; haritada gün renkli çizgi ve numaralı duraklar.
   - Tempoyu "Sakin" yap → yeniden üret → günlük durak sayısı düşer. Günü 10:00–13:00 yap → plan kısalır.
4. **Kaydet** → rota detayı → "Bağlantıya sahip herkes görebilsin" → bağlantıyı gizli pencerede aç (giriş yokken görünür, sahip ve başlangıç noktası yok) → "Yenile" → eski bağlantı artık "bulunamadı".
5. Hazır demo: `#/paylasim/demo011`.

## Yapay zekâ kullanımı

Yapay zekâ rota planlama yaklaşımlarını (gezgin satıcı problemi, açgözlü sezgisel, 2-opt, kümeleme) karşılaştırmak, modülün veri modeli ve doğrulama örnekleri için öneri almak ve `planner.js`'i saf fonksiyonlara ayırma refaktörü için kullanıldı. Öneriler testlerle doğrulandı: ilk sürümde günler coğrafi olarak dağınıktı (1. gün Boğaz'ın karşısına geçip geri dönüyordu); "çapa" yaklaşımı eklenip gün içi en uzak iki durak arası mesafe ölçülerek iyileşme doğrulandı.

## Öğrencinin kendi geliştireceği bölümler

> Sözlü sınavda bunları kendi cümlelerinle anlatabilmelisin.

- **Modülün çekirdek mantığını kendin yazmak:** `planner.js` içindeki `buildDay` fayda formülündeki katsayıları (2 × yol süresi, 8 × çapaya uzaklık, 15 × aynı kategori) değiştirip planın nasıl değiştiğini gözlemle ve kendi seçimini gerekçelendir. Ek görev önerisi: **günün sonunda başlangıç noktasına (otele) dönüş** yolunu da günlük süre ve km hesabına kat.
- **İş kuralları ve doğrulamayı uygulamak:** Yeni bir kural ekle ve testini yaz. Öneri: "Yoğun tempoda bir günde 2'den fazla 'Tarih & Müze' yeri olmasın" veya "Müzeler 17:00'den sonra başlayamaz" (`schedule` içinde).

## Sözlü sınav hazırlığı

**1) Günlük planı nasıl kurdun?**
Her gün için dört adım. (1) **Çapa:** kalan en değerli yeri günün bölgesi olarak seçiyorum; önceki günlerin bölgelerine yakın olanları cezalandırarak her günü farklı bir semte odaklıyorum. (2) **Açgözlü seçim:** bulunduğum noktadan, kısıtları bozmayan adaylar arasında "fayda" değeri en yüksek olanı ekliyorum. Fayda = ilgi puanı − yol süresi cezası − çapadan uzaklık cezası − aynı kategori cezası; "mutlaka" seçilenler büyük bonus alıyor. (3) **2-opt:** sırayı ters çevirerek toplam yol kısalıyorsa sırayı değiştiriyorum. (4) **Çizelge:** gün başlangıcından itibaren yol + ziyaret + tampon ekliyorum, 12:00–14:00 arası ilk boşlukta öğle arası veriyorum. Bir POI kullanıldıktan sonra sonraki günlerde aday olmuyor.

**2) Süre kısıtını nasıl uyguladın?**
Bir adayı eklemeden önce o adayla birlikte **günün tüm çizelgesini yeniden hesaplıyorum** (`schedule`). Varış = önceki bitiş + tampon + yol süresi (+ gerekirse öğle arası), bitiş = varış + ziyaret süresi. Son durak gün bitiş saatini geçiyorsa `schedule` `null` döner ve aday eklenmez. Aynı anda günlük yol km'si tempo sınırını aşıyorsa da eklenmez. Durak sayısı tempo sınırına gelince gün kapanır. Kaydederken plan sunucuda yeniden üretildiği için istemci bu kısıtları atlatamaz (R9). Bunu bağımsız bir doğrulayıcıyla 72 parametre bileşiminde test ettim.

**3) Bu modülün verisini nasıl modelledin?**
`trips` (1) → `day_plans` (N) → `day_plan_items` (N) ← `pois`. Bu hafta duraklara `end_time`, `travel_minutes`, `travel_km`, `travel_mode`; rotaya üretim parametreleri (`pace`, `day_start`, `day_end`, `start_lat/lng`, `generated`) ve paylaşım (`is_public`, `share_code`) ekledim. Kurallar veritabanında da var: `end_time > start_time`, gün penceresi ≥ 3 saat, başlangıç koordinatları ikisi birden, aynı gün aynı POI tekrar edemez (`UNIQUE(day_plan_id, poi_id)`). Yol süresi aslında hesaplanabilir bir değer; yine de saklıyorum çünkü kullanıcının gördüğü plan kayıt anındaki plandır, katalog sonradan değişse de rota aynı kalmalı.

**4) Bu modülde hangi iş kuralını neden koydun?**
**R9 — kaydedilen plan sunucuda yeniden üretilir.** Önizlenen planı istemciden alıp kaydetseydim, biri isteği değiştirerek 23:00'e taşan veya pasif POI içeren bir planı geçerliymiş gibi kaydedebilirdi; "doğrulamayı yalnızca arayüzde yapmak" hatası olurdu. Algoritma deterministik olduğu için yeniden üretim önizlemeyle aynı sonucu veriyor. **R10/R11 — paylaşım varsayılan kapalı, otel konumu gizli:** paylaşılan bağlantı herkese açık olduğundan kullanıcının nerede kaldığı sızmamalı. **R7 — sığmayan zorunlu yer sessizce atılmaz**, gerekçesiyle raporlanır; kullanıcı neden eksik olduğunu bilmeli.

**5) Bu modülü diğer modüllerle nasıl entegre ettin?**
- **Modül A (ilgi profili + katalog):** adaylar profildeki ilgi alanlarındaki **aktif** POI'ler; puanlama için Modül A'nın `scoreForProfile` fonksiyonunu ortak kullanıyorum (aynı puan Keşfet'te de görünüyor); tempo varsayılanı profilden. Profilde ilgi yoksa planlayıcı kullanıcıyı Profilim'e yönlendiriyor.
- **Katalog yönetimi:** rotadaki bir POI silinmek istenince pasifleşiyor; kayıtlı rota bozulmuyor, durak "artık katalogda yok" etiketiyle görünüyor.
- **Kimlik/rol (H5):** planlama giriş gerektiriyor, rota her zaman giriş yapan kullanıcı adına; detay, silme ve paylaşım sahiplik kontrollü.
- **Veri erişimi (H4):** rota + günler + duraklar tek transaction'da kaydediliyor.
- Önceki haftaların test setleri değişmeden geçiyor.

## Teorik kavramlar (kısa)

- **Veri modeli:** Rota → gün → durak hiyerarşisi (1-N-N), durak POI ile çoka-çok ilişkinin ara tablosu ve kendi nitelikleri var (saat, yol).
- **İş kuralı / doğrulama:** Biçim (saat SS:DD) doğrulaması ile anlam kuralları (pencere ≥ 3 saat, sığmayan durak eklenmez) ayrı; ikisi de sunucuda, önemli olanlar ayrıca DB kısıtı.
- **Modülerlik:** Çekirdek algoritma (`planner.js`) veritabanını ve HTTP'yi bilmiyor → tek başına test edilebiliyor ve ileride değiştirilebiliyor; servis katmanı onu repository'lerle birleştiriyor.
- **Sezgisel (heuristic) algoritma:** En iyi rota (gezgin satıcı problemi) çok büyük girdide pratik değil; açgözlü + 2-opt "yeterince iyi" sonucu milisaniyede veriyor.

## Sık yapılan hatalar ve alınan önlem

| Hata | Önlem |
|---|---|
| Doğrulamayı atlamak | R1–R8 sunucuda; plan sunucuda yeniden üretiliyor (R9); DB kısıtları |
| Erişim/sahiplik kontrolünü unutmak | Rota detay/silme/paylaşım yalnızca sahibi veya yönetici; paylaşım sayfasında sahip ve otel konumu gizli |
| İlişkili kayıtları yönetmemek | Rota + günler + duraklar tek transaction; rota silinince günler/duraklar CASCADE; kullanılan POI silinmiyor, pasifleşiyor |
