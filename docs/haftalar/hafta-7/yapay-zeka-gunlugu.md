# Kişiselleştirilmiş Gezi Planlayıcı
## Yapay Zekâ Kullanım Günlüğü · Hafta 7

| Alan | Bilgi |
|---|---|
| Öğrenci | Diyar Karaduman |
| Numara | 251161035 |
| Proje (Kod/Ad) | P45 · Kişiselleştirilmiş Gezi Planlayıcı |
| Hafta No | 7 · Rota ve Gün Planı Üretimi + Entegrasyon |
| Depo | [p45-kisisellestirilmis-gezi-planlay-c-s-](https://github.com/diyarkaraduman73-crypto/p45-kisisellestirilmis-gezi-planlay-c-s-) |

**İlke:** Öğrenci, yapay zekâdan aldığı her anlamlı yardımı bu günlüğe işler. "Açıklar mı?" sütunu "E" olmayan hiçbir kod parçası teslim edilemez.

**KVKK:** Yapay zekâ aracına gerçek kişisel veri girilmemiştir. Projedeki tüm kullanıcılar sentetiktir ("Deneme Kullanıcı 01", `@example.com` e-postaları); POI'ler herkese açık turistik mekânlardır.

> "Açıklar mı? (E/H)" sütunu öğrencinin kendi beyanıdır.

| Tarih | Araç | Amaç/Görev | İstem (özet) | Öğrencinin değişikliği / doğrulaması | Açıklar mı? (E/H) |
|---|---|---|---|---|---|
| 05.11.2026 | Claude (Anthropic) | Rota/plan mantığı | Hafta 7 görev kartını gönderdim; ilgi ve süreye göre gün gün plan üreten modül istedim. | `planner.js` içindeki dört adımı (çapa, açgözlü seçim, 2-opt, çizelge) modül açıklamasından okudum. |  |
| 05.11.2026 | Claude (Anthropic) | Süre/mesafe kısıtı | Gün penceresi ve tempoya göre sınırlar istedim. | Claude 72 parametre bileşiminde kısıt ihlali olmadığını ve kaydedilen planın önizlemeyle aynı olduğunu test etti (46 test). İlk sürümde günlerin dağınık olduğu fark edilip "çapa" adımı eklendi. |  |
| 05.11.2026 | Claude (Anthropic) | Kaydet/paylaş | Planı kaydetme ve bağlantıyla paylaşma istedim. | Paylaşımın varsayılan kapalı olduğunu ve paylaşılan sayfada otel konumunun gizlendiğini (R10, R11) okudum. |  |
| 05.11.2026 | Claude (Anthropic) | VS Code'da açma | Projeyi VS Code'da nasıl açacağımı ve Node.js kurulumunu sordum; projeyi zip olarak istedim. | Zip dosyasını indirdim; Node.js kurulumunu `node -v` ile kontrol etme adımlarını aldım. |  |
| 05.11.2026 | Claude (Anthropic) | Yayına alma | Siteyi ücretsiz yayınlamak için adım adım yardım istedim. | Neon, Render ve Vercel hesaplarını kendim açtım; veritabanı adresini ve gizli anahtarı kendim girdim (Claude'la paylaşmadım). `/api/health` sayfasını ve Vercel sitesini tarayıcıda kontrol ettim. |  |
| 05.11.2026 | Claude (Anthropic) | Hata giderme | Sitede "Failed to fetch" hatasının ekran görüntüsünü gönderip çözüm istedim. | Vercel'de `VITE_API_URL` ve Render'da `CORS_ORIGIN` ayarlarını kontrol ettim. Claude daha anlaşılır hata mesajı ve CORS düzeltmesini GitHub'a yükledi. |  |
| 06.11.2026 | Claude (Anthropic) | Sözlü sınav hazırlığı | Hafta 3–7 sözlü sınav sorularını cevaplarıyla toplu yazmasını istedim. | Cevapları kodla karşılaştırarak çalıştım. |  |
| 06.11.2026 | Claude (Anthropic) | Kullanım günlüğü | Hafta 3–7 için yapay zekâ kullanım günlüğünü örnek forma göre hazırlamasını ve haftaları ayrı klasörlere koymasını istedim. | Satırları okudum; Açıklar mı? sütununu kendim dolduracağım. |  |

Haftanın raporu: [rapor.md](rapor.md)
