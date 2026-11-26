# Hafta 9 · Harici API Entegrasyonu: Harita

**Amaç:** Rotayı harita servisiyle entegre etmek.
**Modül:** Harita entegrasyonu — ayrıntılı açıklama: [docs/moduller/harita-entegrasyonu.md](../../moduller/harita-entegrasyonu.md) · **Sürüm:** `0.9.0`

## Yapılanlar

- [x] **Harita API:** openrouteservice (HeiGIT) Directions v2, yürüyüş profili, GeoJSON çıktı; anahtar `ORS_API_KEY` ortam değişkeninde
- [x] **Rota çizimi:** duraklar arası gerçek yürüme yolu; yürüyüş bacakları düz, toplu taşıma bacakları kesikli; Planla önizlemesi, kayıtlı rota ve paylaşım sayfasında
- [x] **Hata yönetimi:** 8 sn zaman aşımı, geçici hatada yeniden deneme, 429/`Retry-After`, 401/403 ayrımı, bozuk yanıt; her durumda düz çizgiye düşüp kullanıcıya nedeni söyleniyor
- [x] **Hız sınırı:** dışarıya dakikada en fazla 30 istek (plan 40/dk), kendi uçlarımızda kullanıcı/IP başına 60/dk, aynı yol 24 saat önbellekte
- [x] **Güncel servis adresi:** eski `api.openrouteservice.org` 24.11.2026'da kapandı; yeni `api.heigit.org/openrouteservice` kullanılıyor
- [x] `/api/health` harita servisinin ayarlı olup olmadığını gösteriyor (anahtarı değil)

## Teslim edilen çıktılar

| Çıktı | Yer |
|---|---|
| Çalışan API entegrasyonu | `backend/src/services/routingService.js`, `routes/routing.js`, `GET /api/trips/:id/days/:day/path`; arayüzde haritadaki yol |
| Hata yönetimi | `backend/src/utils/httpClient.js`, `utils/rateLimit.js`; tablo: [modül açıklaması](../../moduller/harita-entegrasyonu.md#hata-yönetimi) |
| Testler | `backend/tests/birim/harita.test.js` (16 test), entegrasyon testine 9b adımı |

## Test sonuçları

| Test | Sonuç |
|---|---|
| `npm test` — toplam 29 birim testi (16'sı bu hafta) | **29/29 geçti** |
| Zaman aşımı: yanıt vermeyen sahte servis 30 ms sonra iptal → 504 | ✔ |
| 503 → bir kez yeniden deneme → başarı; kısa `Retry-After` ile 429 → bekle ve dene; uzun `Retry-After` → vazgeç | ✔ |
| 403 yeniden denenmiyor, hata mesajında anahtar yok | ✔ |
| Anahtar `Authorization` başlığında, URL'de değil; istek yeni HeiGIT adresine gidiyor | ✔ |
| Aynı yol ikinci kez önbellekten (servise 1 çağrı) | ✔ |
| Dakikalık sınır dolunca servise gidilmiyor, düz çizgi + "N sn sonra" | ✔ |
| 403 / 500 / boş yanıtta uygulama çökmüyor, düz çizgi + anlaşılır uyarı | ✔ |
| Ankara'daki nokta (İstanbul hizmet alanı dışı) ve 13 nokta reddediliyor | ✔ |
| Gerçek servisle uçtan uca (`npm run test:entegrasyon`, adım 9b) | Kendi bilgisayarımda anahtarla çalıştırıp sonucu yazacağım: \_\_ |

> Gerçek servise yapılan istek bu testlerde **taklit edildi** (sahte `fetch`); böylece testler internetsiz, kota harcamadan ve her seferinde aynı sonuçla çalışıyor. Gerçek servisle çalıştığı entegrasyon testinde ve arayüzde kontrol edilir.

## Gösterilecek ilerleme (demo)

1. `backend/.env` içine `ORS_API_KEY=...` yaz, `npm run dev` → `/api/health` → `"services": { "harita": "openrouteservice" }`.
2. **Rotalarım** → bir rota → haritada çizgi sokakları takip ediyor; alttaki not: "🚶 Gerçek yürüme yolu · 3,4 km". Toplu taşıma bacakları kesikli.
3. Gün sekmelerini değiştir: her gün bir kez istenir, geri dönünce yeniden istenmez.
4. **Hata yönetimini göster:** `.env`'de anahtarın sonuna bir harf ekle, sunucuyu yeniden başlat → harita yine çalışıyor, düz çizgi ve "harita servisi anahtarı geçersiz" notu. Anahtarı düzelt.
5. Paylaşılan rota sayfası (`#/paylasim/demo011`): giriş yokken de yol çiziliyor ama otel/başlangıç noktası yolda yok.

## Haftalık kontrol kriterleri

| Kriter | Durum |
|---|---|
| API anahtarı depoda değil | ✔ Yalnızca `.env` / Render Environment; `.env.example` boş; tarayıcıya gitmiyor (sunucu üzerinden) |
| Hatalar yönetiliyor | ✔ 7 hata türü sınıflandırılıyor, hepsinde yedek + kullanıcı mesajı; testlerle doğrulandı |
| Entegrasyon doğru | ✔ Koordinat sırası (GeoJSON [boylam, enlem] ↔ Leaflet [enlem, boylam]) ve bacak bölme testli |

## Öğrencinin kendi geliştireceği bölümler

> Sözlü sınavda bunları kendi cümlelerinle anlatabilmelisin.

- **API çağrılarını kendisi yazıp test etmek:** HeiGIT'ten kendi ücretsiz anahtarını al ve servisi önce uygulamanın dışında dene (aşağıdaki komut; `ANAHTAR` yerine kendininkini yaz, komutu çalıştırdıktan sonra terminal geçmişinden sil). Yanıttaki `way_points` ve `summary` alanlarını bul ve `parseOrsGeojson`'ın bunları nasıl kullandığını eşleştir.
  ```bash
  curl -X POST https://api.heigit.org/openrouteservice/v2/directions/foot-walking/geojson \
    -H "Authorization: ANAHTAR" -H "Content-Type: application/json" \
    -d '{"coordinates":[[28.9802,41.0086],[28.9779,41.0084],[28.9768,41.0054]]}'
  ```
  Ek görev: `walkingPath`'e "1 km'den kısa bacaklarda servis çağırma, düz çiz" kuralı ekle ve testini yaz.
- **Anahtarları ortam değişkeninde saklamak:** `backend/.env`'ye `ORS_API_KEY`'i yaz (yerel), Render → Environment'a aynı değişkeni ekle (yayın). Vercel'e **ekleme** — neden eklemediğini anlatabilmelisin (aşağıda 3. soru).

## Sözlü sınav hazırlığı

**1) Rotayı haritada nasıl gösterdin?**
Harita Leaflet + OpenStreetMap karoları (H3'ten beri). Bu hafta duraklar arasına düz çizgi yerine gerçek yürüme yolunu çizdim. Arayüz bir gün sekmesi açılınca bizim API'mize `GET /api/trips/:id/days/:gün/path` isteği atıyor; sunucu o günün durak koordinatlarını (varsa başlangıç noktasıyla) sırayla openrouteservice'e gönderiyor. Servis tüm günün yolunu tek bir çizgi (GeoJSON LineString) olarak, her durağın o çizgideki sırasını da `way_points` olarak döndürüyor. Ben çizgiyi `way_points` ile duraklar arası **bacaklara** bölüyorum; böylece her bacağı kendi stiliyle çizebiliyorum: yürüyüş düz çizgi, toplu taşıma kesikli. Dikkat ettiğim nokta: GeoJSON koordinatları `[boylam, enlem]`, Leaflet `[enlem, boylam]` bekliyor; çevirmeseydim rota Somali açıklarında çıkardı. Bunu testle sabitledim.

**2) Konum yoksa ne yapıyorsun?**
Üç durum var. (a) **Başlangıç noktası (otel/konum) yoksa:** gün ilk durakta başlıyor; yol ilk duraktan çiziliyor, bacak sayısı durak − 1. (b) **Kullanıcı tarayıcıda konum izni vermezse:** Planla sayfası "Konum izni verilmedi" der ve "İlk duraktan başla"ya döner; plan yine üretilir. (c) **Harita servisinden yol gelmezse** (anahtar yok, zaman aşımı, sınır): durakların kendi koordinatları her zaman veritabanında olduğu için düz çizgiyle birleştiriyorum ve haritanın altında nedenini yazıyorum. Paylaşılan sayfada başlangıç noktası bilerek hiç kullanılmıyor (otel konumu gizli kalsın).

**3) API anahtarını nasıl ve nerede sakladın?**
**Sunucuda, ortam değişkeninde:** yerelde `backend/.env` (`.gitignore`'da, depoya gitmez), yayında Render → Environment. Kod `process.env.ORS_API_KEY` ile okuyor. Depoda yalnızca boş `.env.example` var. Anahtarı **Vercel'e (frontend) koymadım**, çünkü `VITE_` ile başlayan değişkenler derlenen JavaScript'in içine gömülür; siteyi açan herkes tarayıcının geliştirici araçlarında görebilir ve kotamı harcayabilir. Bu yüzden tarayıcı servisle doğrudan konuşmuyor, bizim sunucumuz aracı. Ayrıca anahtarı URL'de değil `Authorization` başlığında gönderiyorum (URL'ler kayıtlara düşer), hata mesajlarına yazmıyorum, `/api/health` yalnızca "ayarlı mı" diyor. Sızarsa HeiGIT panelinden iptal edip yenisini Render'a girmek yeterli.

**4) API çağrısı başarısız olursa ne oluyor?**
`httpClient.fetchJson` hatayı türüne göre ayırıyor: 8 saniyede yanıt yoksa istek iptal ediliyor (zaman aşımı), ağ hatası veya 5xx ise bir kez daha deniyor, 429'da `Retry-After` kısaysa bekleyip deniyor, uzunsa vazgeçiyor, 401/403'te hiç denemiyor (anahtar yanlışsa tekrar denemek boşuna). Hata sonunda `routingService` yakalıyor, sunucu kaydına yazıyor ve **düz çizgi + kullanıcıya anlaşılır uyarı** döndürüyor. Yani harita servisi çökse bile rota sayfası açılıyor; plan bizim kendi hesabımız, harita yolu ek bilgi. Kotayı korumak için de dışarıya dakikada en fazla 30 istek gidiyor ve aynı yol 24 saat önbellekte; bizim ucumuzu birisi çok çağırırsa 429 alıyor.

**5) Yanıtı nasıl ayrıştırdın?**
Yanıt bir GeoJSON `FeatureCollection`. `parseOrsGeojson` şunları yapıyor: (1) `features[0].geometry.coordinates` (yolun tüm noktaları) ve `properties.way_points` (durakların bu dizideki sırası) var mı ve doğru tipte mi diye bakıyor; yoksa hata atıyor → yedek. (2) Her koordinatı `[boylam, enlem]`'den `[enlem, boylam]`'e çeviriyor. (3) `way_points[i-1]`'den `way_points[i]`'ye kadar olan dilimi i. bacak yapıyor (uç noktayı iki bacağa da koyuyorum ki çizgiler birleşsin). (4) `properties.segments[i]`'den bacağın metre/saniyesini km/dakikaya çeviriyor, `summary`'den günün toplamını. (5) Bacağın ulaşım türünü yanıttan değil **bizim planımızdan** alıyorum; servis sadece çizgiyi veriyor. Ayrıştırılan sonuç önbelleğe giriyor.

## Teorik kavramlar (kısa)

- **REST:** Kaynaklara URL ile erişip HTTP metodlarıyla (GET oku, POST oluştur/hesapla) işlem yapma; durumsuz, yanıt JSON. ORS'te "yol hesapla" bir POST, çünkü gövdede nokta listesi gönderiliyor.
- **API kimlik doğrulama:** Servis, isteği kimin yaptığını anahtarla anlar ve kotayı ona göre sayar. Anahtar parola gibidir: gizli, sunucuda, iptal edilebilir.
- **Rate limit (hız sınırı):** Servis belirli sürede belirli sayıda isteğe izin verir (ORS: 40/dk, 2000/gün); aşınca 429 döner. Biz hem karşı tarafın sınırına uyuyoruz (30/dk + önbellek) hem kendi ucumuzu koruyoruz (kullanıcı başına 60/dk).
- **Hata yönetimi:** Geçici hata (zaman aşımı, 5xx, 429) → sınırlı yeniden deneme; kalıcı hata (401/403/400) → denemeden vazgeç; her durumda kullanıcıya anlaşılır mesaj ve uygulamanın çalışmaya devam etmesi (zarif bozulma / graceful degradation).

## Sık yapılan hatalar ve alınan önlem

| Hata | Önlem |
|---|---|
| Anahtarı koda gömmek | Yalnızca `process.env.ORS_API_KEY`; testler sahte anahtar kullanıyor; anahtar tarayıcıya hiç gitmiyor |
| Hataları yakalamamak | Tüm çağrılar `fetchJson` üzerinden; her hata türü için test; servis hatası sayfayı çökertmiyor |
| Zaman aşımını yönetmemek | `AbortController` ile 8 sn; yanıt vermeyen servis testi |
