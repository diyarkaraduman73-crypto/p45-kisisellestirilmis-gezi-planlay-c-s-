# Kişiselleştirilmiş Gezi Planlayıcı
## Yapay Zekâ Kullanım Günlüğü · Hafta 3

| Alan | Bilgi |
|---|---|
| Öğrenci | Diyar Karaduman |
| Numara | 251161035 |
| Proje (Kod/Ad) | P45 · Kişiselleştirilmiş Gezi Planlayıcı |
| Hafta No | 3 · Kurulum, Mimari ve Veri Modeli |
| Depo | [p45-kisisellestirilmis-gezi-planlay-c-s-](https://github.com/diyarkaraduman73-crypto/p45-kisisellestirilmis-gezi-planlay-c-s-) |

**İlke:** Öğrenci, yapay zekâdan aldığı her anlamlı yardımı bu günlüğe işler. "Açıklar mı?" sütunu "E" olmayan hiçbir kod parçası teslim edilemez.

**KVKK:** Yapay zekâ aracına gerçek kişisel veri girilmemiştir. Projedeki tüm kullanıcılar sentetiktir ("Deneme Kullanıcı 01", `@example.com` e-postaları); POI'ler herkese açık turistik mekânlardır.

> "Açıklar mı? (E/H)" sütunu öğrencinin kendi beyanıdır.

| Tarih | Araç | Amaç/Görev | İstem (özet) | Öğrencinin değişikliği / doğrulaması | Açıklar mı? (E/H) |
|---|---|---|---|---|---|
| 05.11.2026 | Claude (Anthropic) | Proje planı | P45 proje kartını gönderip haftalık görevlere göre ilerlemesini ve her haftayı GitHub'a yüklemesini istedim. | Proje kartındaki modülleri (ilgi profili, POI kataloğu, rota, harita, kaydet/paylaş, öneri) plana karşılaştırdım. |  |
| 05.11.2026 | Claude (Anthropic) | Teknoloji ve barındırma | Frontend ve backend ayrı olsun, site tamamen ücretsiz yayınlanabilsin dedim. | React + Vite (Vercel), Node.js + Express (Render), PostgreSQL (Neon), Leaflet/OpenStreetMap önerisini kabul ettim; ücretsiz katman sınırlarını okudum. |  |
| 05.11.2026 | Claude (Anthropic) | Depo yapısı | Hafta 3 görev kartını gönderdim; katmanlı klasör yapısı, README ve .gitignore istedim. | GitHub deposunu kendim oluşturdum ve Claude'a yazma izni verdim. Katman klasörlerini (routes, controllers, services, repositories) inceledim. |  |
| 05.11.2026 | Claude (Anthropic) | Mimari | Mimari desen alternatiflerini ve katmanlı mimarinin gerekçesini sordum. | `docs/mimari.md` şemasını okudum; MVC ve mikroservis yerine katmanlı mimarinin neden seçildiğini öğrendim. |  |
| 05.11.2026 | Claude (Anthropic) | ER diyagramı | Kullanıcı, ilgi, POI, rota ve gün planı varlıkları için ER diyagramı istedim. | `docs/veri-modeli.md` diyagramını GitHub'da açıp 1-1, 1-N, N-N ilişkilerini ve 3NF açıklamasını inceledim. |  |
| 05.11.2026 | Claude (Anthropic) | Çalışan iskele | Boş ama çalışan bir iskele (API + harita) istedim. | Claude servis katmanını test etti. Yükleme reddedilince depoya erişim iznini ben verdim ve `hafta-3` dalını GitHub'da kontrol ettim. |  |
| 05.11.2026 | Claude (Anthropic) | Haftalık rapor | Haftanın raporunu ve sözlü sınav cevaplarını istedim. | `rapor.md` dosyasını okudum. |  |

Haftanın raporu: [rapor.md](rapor.md)
