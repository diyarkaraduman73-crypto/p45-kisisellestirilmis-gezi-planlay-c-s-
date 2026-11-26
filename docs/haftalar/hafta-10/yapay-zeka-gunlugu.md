# Kişiselleştirilmiş Gezi Planlayıcı
## Yapay Zekâ Kullanım Günlüğü · Hafta 10

| Alan | Bilgi |
|---|---|
| Öğrenci | Diyar Karaduman |
| Numara | 251161035 |
| Proje (Kod/Ad) | P45 · Kişiselleştirilmiş Gezi Planlayıcı |
| Hafta No | 10 · Yapay Zekâ Bileşeni: Kişisel Plan ve Öneri Üretimi |
| Depo | [p45-kisisellestirilmis-gezi-planlay-c-s-](https://github.com/diyarkaraduman73-crypto/p45-kisisellestirilmis-gezi-planlay-c-s-) |

**İlke:** Öğrenci, yapay zekâdan aldığı her anlamlı yardımı bu günlüğe işler. "Açıklar mı?" sütunu "E" olmayan hiçbir kod parçası teslim edilemez.

**Bu hafta yapay zekâ iki rolde:** (1) geliştirme yardımcısı (Claude, aşağıdaki tablo) ve (2) uygulamanın **çekirdek işlevi** (Groq LLM). Uygulamanın kendi yapay zekâ çağrıları ayrıca veritabanındaki `ai_logs` tablosuna otomatik kaydediliyor ve Yönetim panelinden görülüyor.

**KVKK:** Ne geliştirme aracına ne de uygulamadaki modele gerçek kişisel veri gönderilmemiştir. Uygulama modele ad, e-posta, kullanıcı kimliği ve başlangıç (otel) konumu göndermez (testle doğrulandı). API anahtarı paylaşılmamıştır; testlerde sahte anahtar (`gsk_test`) kullanılmıştır.

> "Açıklar mı? (E/H)" sütunu öğrencinin kendi beyanıdır.

| Tarih | Araç | Amaç/Görev | İstem (özet) | Öğrencinin değişikliği / doğrulaması | Açıklar mı? (E/H) |
|---|---|---|---|---|---|
| 26.11.2026 | Claude (Anthropic) | Model/LLM API seçimi | Hafta 10 görev kartını gönderdim; tercih ve süreye göre gün gün plan ve yerel öneri üreten bileşeni istedim. | Claude Groq'un güncel model listesini kontrol etti; ücretsiz planda kullanılabilen `openai/gpt-oss-20b` varsayılan yapıldı, `GROQ_MODEL` ile değiştirilebiliyor. |  |
| 26.11.2026 | Claude (Anthropic) | Bileşen tasarımı | Yapay zekâ planı mı üretsin, anlatsın mı? | Karar: saat/sıra algoritmadan, anlatım ve öneri seçimi yapay zekâdan. Gerekçeyi rapordaki 1. ve 5. sorularda kendi cümlelerimle yazdım. |  |
| 26.11.2026 | Claude (Anthropic) | İstem tasarımı | Rol, kurallar, JSON şeması | `rehber-v1` istemi `guidePrompt.js`'te; tam metni modül belgesinde okudum. Kendim `rehber-v2` yazıp karşılaştıracağım (öğrenci bölümü). |  |
| 26.11.2026 | Claude (Anthropic) | Çıktı doğrulama | Model çıktısını nasıl kontrol ederim? | `guideValidator.js` (D1–D8) ve şablon yedek yazıldı. 14 birim testi sahte model yanıtlarıyla geçti; doğrulayıcıdan bir kural kasıtlı kapatılınca ilgili testin kırmızıya döndüğü görüldü. |  |
| 26.11.2026 | Claude (Anthropic) | AI günlüğü | Çağrıları kaydetme | Migration 007 (`ai_logs`), Yönetim paneli görünümü. Migration gerçek PostgreSQL'de denendi. Kendi anahtarımla rehber üretip günlükte kaydı göreceğim. |  |
| 26.11.2026 | Claude (Anthropic) | Sözlü sınav hazırlığı | Hafta 10'un 5 sorusu | Cevaplar rapora yazıldı; yapay zekâlı ve şablon rehberi tarayıcıda yan yana görüp 5. soruyu kendi örneğimle anlatacağım. |  |

### Uygulamanın yapay zekâ çağrılarından örnek kayıtlar

Kendi anahtarımla rehber ürettikten sonra Yönetim paneli → Yapay zekâ günlüğü'nden 2–3 kaydı buraya ekleyeceğim:

| Zaman | Model | İstem sürümü | Durum | Süre (ms) | Bulunan sorunlar |
|---|---|---|---|---|---|
|  |  | rehber-v1 |  |  |  |

Haftanın raporu: [rapor.md](rapor.md)
