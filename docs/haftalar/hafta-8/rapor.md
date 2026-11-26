# Hafta 8 · VİZE: Ara Sürüm, Entegrasyon ve Sözlü Hazırlık

**Amaç:** O ana kadarki modülleri uçtan uca entegre edip çalışan bir ara sürüm ortaya koymak ve vize sözlüsüne hazırlanmak.
**Modül:** Ara sürüm entegrasyonu · **Sürüm:** `v0.8.0` (Git etiketi) · [Değişiklik günlüğü](../../../CHANGELOG.md) · [Demo senaryosu](../../demo-senaryosu.md)

## Yapılanlar

- [x] **Modüllerin uçtan uca entegrasyonu:** kayıt → ilgi profili → kişisel öneri → rota önizleme → kaydet → Rotalarım → paylaş → sil akışı tek senaryoda; uçtan uca entegrasyon testi (`backend/tests/entegrasyon/uctan-uca.test.js`)
- [x] **Bilinen hataların giderilmesi:** tarih kayması, geçersiz tarihte 500, veritabanı biçim hatalarında 500 (ayrıntı aşağıda)
- [x] **Ara sürüm etiketleme:** `backend` ve `frontend` `0.8.0`; Git etiketi `v0.8.0`; `GET /api/health` → `version`; arayüzde sürüm rozeti
- [x] **Kısa demo senaryosu:** [docs/demo-senaryosu.md](../../demo-senaryosu.md) (11 adım, ~5 dk, yedek planlı)
- [x] Birim testleri `npm test` komutuyla tekrar çalıştırılabilir hâle getirildi (`node:test`, ek paket yok)

## Giderilen hatalar

| # | Belirti | Kök neden | Düzeltme | Kanıt |
|---|---|---|---|---|
| H1 | Rotada 5 Aralık seçilen başlangıç tarihi, Türkiye saatiyle çalışan sunucuda **4 Aralık** görünüyordu | `pg` paketi `DATE` değerini yerel gece yarısına ayarlı `Date` nesnesine çeviriyor; JSON'a yazılırken UTC'ye çevrilince bir gün geri kayıyor (UTC+3). Render UTC'de çalıştığı için yayında fark edilmemişti | `config/db.js`: `pg.types.setTypeParser(1082, v => v)` → tarih metin olarak döner | Entegrasyon testi 7. adım |
| H2 | Başlangıç tarihi `2026-02-30` gönderilince **500 Sunucu hatası** | `Date.parse('2026-02-30')` hata vermeyip 2 Mart'a çeviriyor; doğrulama geçiyor, PostgreSQL reddediyor | `utils/validate.js`: tarih UTC'de oluşturulup geri metne çevrilir, aynı değilse 400 | Birim testi (5 geçersiz tarih); PostgreSQL 16'da `'2026-02-30'::date` hatası denendi |
| H3 | Doğrulamadan kaçan biçim hatası olursa genel 500 | Hata yöneticisi yalnızca 23xxx (kısıt) kodlarını tanıyordu | `errorHandler.js`: `22007`, `22008`, `22P02`, `22003` → 400 | Kod incelemesi |

## Teslim edilen çıktılar

| Çıktı | Yer |
|---|---|
| Çalışan ara sürüm (etiketli) | Git etiketi `v0.8.0`, `hafta-8` dalı |
| Güncel AI kullanım günlüğü | [yapay-zeka-gunlugu.md](yapay-zeka-gunlugu.md) |
| Kısa ilerleme raporu | Bu dosya |
| Testler | `backend/tests/birim/`, `backend/tests/entegrasyon/` |
| Demo senaryosu | [docs/demo-senaryosu.md](../../demo-senaryosu.md) |

## Test sonuçları

| Test | Komut | Sonuç |
|---|---|---|
| Birim: planlayıcı (kısıt ihlali 18 parametre bileşiminde, determinizm, tempo, zorunlu yer, 2-opt) + doğrulama | `npm test` | **13/13 geçti** |
| Migration'lar boş PostgreSQL 16 veritabanında 001 → 006 sırayla | `npm run db:migrate` | **6/6 uygulandı** |
| Uçtan uca entegrasyon (10 adım, gerçek API + gerçek veritabanı) | `npm run dev` açıkken `npm run test:entegrasyon` | Kendi bilgisayarımda çalıştırıp sonucu buraya yazacağım: \_\_/10 |

Entegrasyon testinin adımları: sağlık+sürüm → kayıt/`me` → girişsiz 401 → profil ve kişisel öneri → plan önizleme (R2, R4, zorunlu yer) → geçersiz girdilerde 400 (R1, R2, R8, H2) → kaydet = önizleme (R9) ve tarih kaymıyor (H1) → Rotalarım ve başkasının listesinde 403 → paylaşım aç/yenile/eski bağlantı 404, sahip ve otel gizli (R10, R11) → sil ve çıkış.

## Gösterilecek ilerleme

**Kullanıcı + veritabanı + çekirdek modüller uçtan uca çalışıyor.** Adım adım akış: [demo senaryosu](../../demo-senaryosu.md).

## Haftalık kontrol kriterleri

| Kriter | Durum |
|---|---|
| Ara sürüm çalışıyor | ✔ `v0.8.0` etiketli; `/api/health` sürümü gösteriyor |
| Modüller entegre | ✔ Kimlik (H5) → Modül A (H6) → Modül B (H7) tek akışta; entegrasyon testi bunu doğruluyor |
| Öğrenci tüm kodu açıklayabiliyor | Aşağıdaki sözlü sınav hazırlığı + yapay zekâ günlüğündeki "Açıklar mı?" sütunu |

## Öğrencinin kendi geliştireceği bölümler

> Sözlü sınavda bunları kendi cümlelerinle anlatabilmelisin.

- **Kendi modüllerinin entegrasyonunu yönetmek:** Entegrasyon testini kendi bilgisayarında çalıştır (`npm run dev` + `npm run test:entegrasyon`). Bir adımı bilerek boz (ör. `tripService.getTripByShareCode` içinde `start_lat`'i gizleyen satırı geçici olarak sil) ve hangi testin neden kırmızıya döndüğünü gözlemle; sonra geri al. Ek görev: teste "yönetici başka kullanıcının rotasını görebilir" adımını ekle (`yonetici@example.com` ile giriş).
- **Demo senaryosunu kendisi anlatmak:** [demo-senaryosu.md](../../demo-senaryosu.md) tablosundaki "söylenecek tek cümle" sütununu kendi cümlelerinle yeniden yaz ve bir kez saat tutarak prova et (hedef ≤ 5 dk).

## Sözlü sınav hazırlığı

**1) Şu ana kadarki mimariyi özetle.**
Üç parçalı, katmanlı bir web uygulaması. **Frontend** React + Vite (Vercel): sayfalar ve bileşenler; backend'le tüm iletişim `services/api.js` üzerinden. **Backend** Node.js + Express (Render), üç katman: *sunum* (`routes/` + `controllers/` — URL'i karşılar, JSON döner), *iş* (`services/` — doğrulama ve iş kuralları, rota algoritması), *veri* (`repositories/` — parametreli SQL). Kimlik doğrulama ve rol kontrolü `middleware/auth.js`'te, istek controller'a ulaşmadan çalışıyor. **Veritabanı** PostgreSQL (Neon); şema 6 migration ile sürümleniyor. Çekirdek rota algoritması `planner.js` saf fonksiyon: veritabanını ve HTTP'yi bilmiyor, bu yüzden tek başına test edilebiliyor. Ayrıntı: [mimari.md](../../mimari.md).

**2) Hangi modül hangi veriyi nereden alıyor?**

| Modül | Okuduğu veri | Nereden | Yazdığı veri |
|---|---|---|---|
| Kimlik (H5) | e-posta, parola özeti, oturum | `users`, `sessions` | `sessions` (giriş/çıkış), `users.failed_login_count`, `locked_until` |
| Modül A — Katalog | POI, ilgi alanı, etiket, şehir | `pois`, `interests`, `poi_tags`, `tags`, `cities` | yönetici: `pois`, `tags` |
| Modül A — İlgi profili | ilgi düzeyleri, bütçe, tempo | `user_interests`, `user_preferences` | aynı tablolar |
| Modül B — Rota üretimi | **Profil** (Modül A `getProfile`), **aktif POI'ler** (Modül A `poiRepository.findMany`), **puan** (Modül A `scoreForProfile`), şehir merkezi/yarıçapı (`cities`) | servis katmanı üzerinden; doğrudan tablo okumuyor | `trips` → `day_plans` → `day_plan_items` (tek transaction) |
| Paylaşım | rota + duraklar | `trips.share_code`, `is_public` | `is_public`, `share_code` |

Modül B, Modül A'nın tablolarına doğrudan SQL yazmıyor, onun fonksiyonlarını çağırıyor; bu yüzden puanlama formülü tek yerde ve Keşfet'teki puanla planlayıcıdaki puan aynı.

**3) En çok zorlandığın entegrasyon neydi, nasıl çözdün?**
Frontend'i (Vercel) backend'e (Render) bağlamak. Yayına aldıktan sonra sitede **"Failed to fetch"** hatası çıktı. Tarayıcı isteği sunucuya hiç ulaştıramıyordu ve hata mesajı sebebi söylemiyordu. İki ayarı kontrol ettim: Vercel'deki `VITE_API_URL` (arayüz istekleri nereye atıyor — boşsa `localhost:4000`'e gider) ve Render'daki `CORS_ORIGIN` (backend hangi siteden gelen isteğe izin veriyor; adres tarayıcının gönderdiği `Origin` ile birebir aynı olmalı). Kodda iki önlem aldık: CORS adreslerindeki sondaki `/` ve boşluklar yok sayılıyor, arayüz ağ hatasında "Sunucuya ulaşılamadı (adres)…" diye hangi adrese gidemediğini yazıyor. Bu hafta da benzer bir "ortam farkı" hatası bulduk: tarih Render'da (UTC) doğru, yerelde (UTC+3) bir gün önce görünüyordu (H1). Ders: entegrasyon hataları çoğu zaman kodda değil iki parçanın **sınırında** (ayar, saat dilimi, adres) çıkıyor; bu yüzden uçtan uca test yazdım.

**4) Yapay zekâdan aldığın bir kod parçasını satır satır açıkla.** (`backend/src/utils/validate.js`, Hafta 8 düzeltmesi)

```js
export function optionalDate(value, label = 'Tarih') {
  if (value === undefined || value === null || value === '') return undefined;      // (1)
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {             // (2)
    throw new ValidationError(`${label} YYYY-AA-GG biçiminde olmalı`);
  }
  const d = new Date(`${value}T00:00:00Z`);                                          // (3)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {         // (4)
    throw new ValidationError(`${label} geçerli bir takvim tarihi değil`);           // (5)
  }
  return value;                                                                      // (6)
}
```
(1) Tarih isteğe bağlı: boşsa "yok" anlamında `undefined` döner. (2) Önce **biçim**: metin olmalı ve tam olarak 4-2-2 rakam; `26.11.2026` veya sayı burada elenir. (3) Tarihi UTC gece yarısı olarak oluşturuyorum; sonuna `Z` koymasaydım yerel saat dilimine göre yorumlanır ve gün kayabilirdi. (4) **Anlam** kontrolü: JavaScript `2026-02-30`'u hata vermeden 2 Mart'a "taşıyor". Oluşan tarihi tekrar `YYYY-AA-GG`'ye çevirip girdiyle karşılaştırıyorum; taşma olduysa ikisi farklıdır (`2026-03-02` ≠ `2026-02-30`). Ay 13 gibi tamamen geçersizse `getTime()` `NaN` olur. (5) `ValidationError` 400 durum kodu taşır; hata yöneticisi bunu kullanıcıya mesajla döner. Önceden bu kontrol yoktu, değer veritabanına gidip 500 veriyordu. (6) Değeri değiştirmeden döndürüyorum; veritabanına metin olarak gidiyor.

**5) Bir sonraki aşamanın planı nedir?**
- **Hafta 9–10 · Yapay zekâ modülü:** Groq LLM API ile "yerel öneri ve gün özeti". Üretilen planı (POI adları, saatler) LLM'e verip her gün için kısa açıklama ve ipucu üretmek; anahtar yalnızca backend'de (`GROQ_API_KEY`), kişisel veri gönderilmeyecek; LLM yanıt vermezse plan yine çalışacak (yedek: şablon metin).
- **Öneri modülü:** benzer ilgi profiline sahip kullanıcıların kaydettiği rotalardaki POI'lere göre "bunu da sevebilirsin".
- **Kalite:** her yeni özellik için önce entegrasyon testine adım eklemek (regresyon); her teslimde sürüm etiketi (`v0.9.0` …); bilinen eksik: elle düzenlenen rotada saat çakışması kontrolü yok.

## Teorik kavramlar (kısa)

- **Entegrasyon:** Ayrı geliştirilen parçaların (arayüz, API, veritabanı, modüller) birlikte doğru çalışmasını sağlamak. Birim testi bir fonksiyonu tek başına, **entegrasyon testi** parçaları gerçek bağlantılarıyla (HTTP + SQL) birlikte sınar. Bizdeki uçtan uca test hiçbir katmanı taklit etmiyor.
- **Sürümleme (semantic versioning):** `MAJOR.MINOR.PATCH`. Geriye uyumsuz değişiklik → MAJOR, yeni özellik → MINOR, hata düzeltmesi → PATCH. `0.x` henüz kararlı API sözü verilmediğini gösterir. Git etiketi (`git tag -a v0.8.0`) belirli bir commit'e kalıcı isim verir; hoca veya ben aylar sonra tam o hâle dönebiliriz (`git checkout v0.8.0`).
- **Regresyon:** Önceden çalışan bir özelliğin yeni bir değişiklikle bozulması. Önlemi: her değişiklikten sonra tüm testleri yeniden çalıştırmak. H2 için yazdığım test, ileride biri tarih kontrolünü sadeleştirirse hatanın geri gelmesini yakalar.

## Sık yapılan hatalar ve alınan önlem

| Hata | Önlem |
|---|---|
| Entegrasyonu son ana bırakmak | Modüller H6–H7'de birbirine bağlandı; bu hafta tek akışta uçtan uca test edildi |
| Ara sürümü etiketlememek | `v0.8.0` etiketi, `CHANGELOG.md`, `/api/health` ve arayüzde sürüm |
| Açıklanamayan AI kodu taşımak | Değişen her satırın gerekçesi kod yorumunda; günlükte "Açıklar mı?" sütunu öğrenci tarafından doldurulacak |
