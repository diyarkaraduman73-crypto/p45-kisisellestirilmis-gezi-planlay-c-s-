# Hafta 10 · Yapay Zekâ Bileşeni: Kişisel Plan ve Öneri Üretimi

**Amaç:** Tercih ve süreye göre gün gün gezi planı ve yerel öneri üreten bileşeni kurmak.
**Modül:** Kişisel Plan ve Öneri Üretimi — ayrıntılı açıklama, istemin tamamı ve örnek çıktı: [docs/moduller/yapay-zeka-bileseni.md](../../moduller/yapay-zeka-bileseni.md) · **Sürüm:** `0.10.0`

## Yapılanlar

- [x] **Tercih verisi:** rota sahibinin ilgi düzeyleri, bütçesi, temposu + planın günleri/durakları + profile göre puanlanmış en fazla 10 öneri adayı; kişisel veri yok
- [x] **Plan/öneri üretimi:** Groq LLM (`openai/gpt-oss-20b`) her günü anlatan başlık/özet, durak ipuçları ve adaylardan en fazla 3 yerel öneri üretiyor; saat ve sıra bizim algoritmamızdan (H7)
- [x] **Doğrulama:** 8 kural (D1–D8): JSON, şema, gün, durak–gün eşleşmesi, öneri aday listesinde mi, metin temizliği, fiyat ve plan dışı saat, boş içerik
- [x] **Hatalı/boş çıktı:** şablon yedek, kısmi düzeltme, kullanıcıya açık durum rozeti
- [x] **AI günlüğü:** `ai_logs` tablosu (migration 007) + Yönetim panelinde görünüm
- [x] Arayüz: rota sayfasında "✨ Kişisel gezi rehberi" kartı (paylaşım sayfasında salt okunur)

## Teslim edilen çıktılar

| Çıktı | Yer |
|---|---|
| Çalışan yapay zekâ bileşeni | `backend/src/services/ai/`, `aiGuideService.js`, `POST /api/trips/:id/guide`; arayüzde rota sayfası |
| AI kullanım günlüğü | Uygulama içi: `ai_logs` tablosu ve Yönetim paneli · Ders günlüğü: [yapay-zeka-gunlugu.md](yapay-zeka-gunlugu.md) |
| İstem ve çıktı belgeleri | [Modül açıklaması](../../moduller/yapay-zeka-bileseni.md) (istem, kararlar, örnek çıktı, doğrulama tablosu) |
| Testler | `backend/tests/birim/yapay-zeka.test.js` (14 test), entegrasyon testine 9c adımı |

## Test sonuçları

| Test | Sonuç |
|---|---|
| `npm test` — toplam 43 birim testi (14'ü bu hafta) | **43/43 geçti** |
| İstemde ad, e-posta, otel konumu yok; tüm plan/aday kimlikleri var | ✔ |
| Groq isteği: doğru uç, `Bearer` anahtar, JSON modu, model; anahtar yoksa istek gitmiyor | ✔ |
| Geçerli yanıt sorunsuz geçiyor; ` ```json ` çitli ve önsözlü yanıt ayıklanıyor | ✔ |
| JSON olmayan, kesik, boş (`{}`), dizi (`[]`) yanıt → şablon | ✔ |
| Uydurma yer (#999) ve başka güne ait durak için ipucu atılıyor | ✔ |
| Planda olan, aday olmayan, tekrar eden ve 3'ten fazla öneri atılıyor | ✔ |
| "Giriş 25 €", "17.30'da kapanır" cümleleri atılıyor; plandaki "09:00" kalıyor | ✔ |
| Planda olmayan gün atılıyor, eksik gün şablonla tamamlanıyor | ✔ |
| Servis hatası / anahtar yok / anlamsız yanıt → şablon ve neden; ham yanıt günlüğe yazılıyor | ✔ |
| Doğrulayıcıdan bir kural kasıtlı olarak kapatılınca ilgili test kırmızıya dönüyor (testin gerçekten bir şey ölçtüğünün kontrolü) | ✔ |
| Migration 007 boş PostgreSQL 16'da 001–007 sırayla uygulanıyor; `ai_logs` durum kısıtı geçersiz değeri reddediyor | ✔ |
| Gerçek modelle (`GROQ_API_KEY` ile) uçtan uca (`npm run test:entegrasyon`, adım 9c) | Kendi bilgisayarımda anahtarla çalıştırıp sonucu yazacağım: \_\_ |

> Testlerde gerçek model yerine **sahte model** kullanıldı: aynı test her seferinde aynı yanıtı alır, internetsiz ve ücretsiz çalışır, kasıtlı bozuk yanıtlar (uydurma yer, fiyat, JSON olmayan metin) denenebilir. Gerçek modelin çıktısı her seferinde biraz farklı olduğu için onu "kesin şu metni üret" diye test etmek mümkün değil; gerçek çıktının **kurallara uyduğunu** entegrasyon testi (9c) kontrol ediyor.

## Gösterilecek ilerleme: yapay zekânın ürettiği çıktı örnek veriyle

1. `backend/.env` → `GROQ_API_KEY=...`; `npm run db:migrate` (007), `npm run dev`; `/api/health` → `"yapayZeka": "groq (openai/gpt-oss-20b)"`.
2. `kullanici01@example.com` ile gir → **Rotalarım** → bir rota → sol altta **✨ Kişisel gezi rehberi → Rehber oluştur**.
3. Gösterilecekler: mor rozet "Yapay zekâ ile üretildi · doğrulandı", genel bakış, gün sekmesi değişince o günün başlığı/özeti/ipuçları, "Bunları da sevebilirsin" önerileri (plandaki yerler değil, katalogdan).
4. **Yönetim paneli** (`yonetici@example.com`) → Yapay zekâ günlüğü: model, `rehber-v1`, süre, durum, bulunan sorunlar.
5. **Hata durumu:** `.env`'de `GROQ_API_KEY`'i boşalt, sunucuyu yeniden başlat, **Yeniden oluştur** → gri rozet "Kurallarla hazırlandı (şablon)" ve neden. Yapay zekâlı ve yapay zekâsız çıktıyı yan yana göster (5. sözlü soru).

## Haftalık kontrol kriterleri

| Kriter | Durum |
|---|---|
| AI çıktısı doğrulanıyor | ✔ D1–D8, 14 test |
| Hatalı/boş çıktı yönetiliyor | ✔ Şablon yedek + kısmi düzeltme + kullanıcıya rozet ve neden |
| İstem ve çıktı belgeleniyor (AI günlüğü) | ✔ İstem ve sürüm kodda ve modül belgesinde; her çağrı `ai_logs`'ta; ders günlüğü güncel |

## Öğrencinin kendi geliştireceği bölümler

> Sözlü sınavda bunları kendi cümlelerinle anlatabilmelisin.

- **İstem tasarımını kendin iyileştirmek:** `guidePrompt.js`'te bir değişiklik yap (ör. "Her günün özetinde o günün yürüyüş miktarına göre bir öneri ver" kuralı ekle), `PROMPT_VERSION`'ı `rehber-v2` yap, aynı rotada iki kez rehber üret ve Yönetim panelindeki günlükte v1 ile v2'yi karşılaştır. Neyin değiştiğini ve neden daha iyi/kötü olduğunu rapora iki cümleyle yaz.
- **AI çıktısını doğrulama mantığını yazmak:** `guideValidator.js`'e yeni bir kural ekle ve testini yaz. Öneri: "Genel bakış ilgi alanlarından en az birini anmıyorsa sorun kaydet" veya "İpucu durağın kendi adını tekrar etmekten ibaretse at".

## Sözlü sınav hazırlığı

**1) Planı neye göre ürettin?**
İki katmanlı. **Planın iskeleti** (hangi yerler, hangi gün, hangi sırada, saat kaçta) H7'deki kendi algoritmamdan geliyor: ilgi profilindeki düzeylere göre puanlanmış aktif POI'ler, gün penceresi, tempo (günlük durak ve km sınırı), zorunlu/hariç yerler. **Yapay zekâ** bu hazır planı alıp kişiye göre anlatıyor: her güne başlık ve özet, durak başına pratik ipucu ve plana girmemiş yerlerden öneri. Modele giden tercih verisi ilgi düzeyleri ("Tarih & Müze 5/5"), bütçe, tempo ve planın kendisi. Öneri adaylarını da ben seçiyorum: ilgi alanına uyan, aktif, planda olmayan, profile göre en yüksek puanlı 10 yer. Model bunlardan en fazla 3'ünü seçip nedenini yazıyor.

**2) Gerçekçi olmayan planı nasıl önledin?**
Üç katmanda. (a) **Yapısal:** saatleri ve sırayı modele hiç hesaplatmıyorum; kısıtları bilinen ve test edilen algoritma hesaplıyor. Model mekânları adıyla değil `poi_id` ile anıyor ve yalnızca verdiğim listeden seçebiliyor. (b) **İstem:** "listede olmayan yer uydurma, planı değiştirme, fiyat/açılış saati yazma, yalnızca plandaki saatleri kullan" kuralları. (c) **Doğrulama (en önemlisi, çünkü model kurallara her zaman uymaz):** her ipucunun `poi_id`'si o günün planında mı, her öneri aday listesinde ve planın dışında mı; fiyat veya planda olmayan bir saat içeren cümleyi atıyorum ("Müze 17.30'da kapanır" gibi, doğru olup olmadığını bilemem). Ayrıca arayüzde "gitmeden saatleri ve ücretleri kontrol et" notu var.

**3) İstemini (prompt) nasıl tasarladın?**
Dört bölüm: **rol** ("kısa ve somut yazan yerel rehber"), **görev** (hazır planı anlat, ipucu yaz, adaylardan öner), **numaralı kurallar** (uydurma yok, planı değiştirme, doğrulanamayan bilgi yok, kişisel hitap, uzunluk sınırları) ve **çıktı şeması** (tam JSON örneği). Veriyi düz metin değil JSON olarak veriyorum ve kimlik istiyorum, böylece çıktıyı programla kontrol edebiliyorum. `temperature` 0.4 (tutarlılık), Groq'un JSON modu açık. İstemin bir sürümü var (`rehber-v1`); değiştirdiğimde günlükte hangi çıktının hangi istemle üretildiğini görebiliyorum. Gizlilik: istemde ad, e-posta ve otel konumu yok; bunu testle kontrol ediyorum.

**4) AI çıktısı hatalıysa ne yapıyorsun?**
Hatanın büyüklüğüne göre. **Kısmen hatalıysa** (uydurma bir yer önerdi, fiyat yazdı, 5 öneri verdi, bir günü atladı) yalnızca hatalı parçayı atıyorum veya şablonla tamamlıyorum, gerisini kullanıyorum; rozet "doğrulandı, bazı kısımlar düzeltildi" oluyor. **Tamamen kullanılamazsa** (JSON değil, boş, kesik) ya da servis hiç yanıt vermezse (anahtar yok, 20 sn zaman aşımı, kota) kurallarla üretilen **şablon rehbere** düşüyorum ve nedenini kullanıcıya yazıyorum: kullanıcı hiçbir zaman boş ekran ya da "Sunucu hatası" görmüyor. Her durumda `ai_logs`'a durum, bulunan sorunlar ve ham yanıtın başı yazılıyor; böylece modelin ne sıklıkla hata yaptığını Yönetim panelinden görebiliyorum.

**5) Bu işlevi AI olmadan yapabilir miydin, farkı ne?**
**Evet, kısmen**; zaten yaptım: şablon rehber (`fallbackGuide.js`) yapay zekâsız çalışıyor. Günün semtlerinden başlık ("Fatih günü"), saat aralığı ve tür dağılımından özet çıkarıyor, en yüksek puanlı 3 adayı puan gerekçesiyle öneriyor. **Artısı:** her zaman aynı sonuç, hızlı, ücretsiz, uydurma yapamaz, test etmesi kolay. **Eksisi:** dili kalıplı ve kişisel değil; "Üst galeriye çıkmayı unutma" ya da "Ayasofya'ya çok yakın, aynı sabah eklenebilir" gibi bağlamı birleştiren cümleleri kurallarla yazmak için her mekân ve her durum için elle metin yazmam gerekirdi. Yapay zekânın **bedeli** de var: yavaş (birkaç saniye), kota ve anahtar gerektiriyor, her seferinde farklı sonuç veriyor ve hata yapabiliyor; bu yüzden doğrulama ve yedek şart. Benim tercihim: kesin olması gereken işi (plan) kurallar, dil gerektiren işi (anlatım) yapay zekâ yapsın.

## Teorik kavramlar (kısa)

- **Model/LLM API kullanımı:** Büyük dil modeline HTTP üzerinden mesaj (sistem + kullanıcı) gönderip yanıt alma. Groq, OpenAI uyumlu `chat/completions` ucunu sunuyor; anahtar `Authorization: Bearer` başlığında, sunucuda.
- **İstem tasarımı:** Rol, görev, kurallar, örnek/şema ve veriyi açıkça ayırmak; ölçülebilir sınırlar koymak; istemi sürümlemek.
- **Çıktı doğrulama:** Model çıktısını güvenilmeyen kullanıcı girdisi gibi ele almak: biçim, şema, referans bütünlüğü (kimlikler gerçekten var mı), içerik kuralları.
- **Etik/şeffaflık:** Kullanıcıya içeriğin yapay zekâyla üretildiğini ve hata yapabileceğini söylemek; kişisel veriyi modele göndermemek; hangi modelin hangi istemle ne ürettiğini kaydetmek (hesap verebilirlik).

## Sık yapılan hatalar ve alınan önlem

| Hata | Önlem |
|---|---|
| AI çıktısını körlemesine kullanmak | D1–D8 doğrulaması; model yalnızca kimlikle ve verilen listeden seçebiliyor; saatleri model değil algoritma üretiyor |
| İstemi belgelememek | İstem kodda tek dosyada, sürümlü; modül belgesinde tam metin ve tasarım kararları; her çağrı istem sürümü ve özetiyle günlükte |
| Hatalı çıktıyı yönetmemek | Kısmi düzeltme + şablon yedek + kullanıcıya rozet/neden + günlük |
