# Kişiselleştirilmiş Gezi Planlayıcı
## Yapay Zekâ Kullanım Günlüğü · Hafta 6

| Alan | Bilgi |
|---|---|
| Öğrenci | Diyar Karaduman |
| Numara | 251161035 |
| Proje (Kod/Ad) | P45 · Kişiselleştirilmiş Gezi Planlayıcı |
| Hafta No | 6 · POI Kataloğu ve İlgi Profili |
| Depo | [p45-kisisellestirilmis-gezi-planlay-c-s-](https://github.com/diyarkaraduman73-crypto/p45-kisisellestirilmis-gezi-planlay-c-s-) |

**İlke:** Öğrenci, yapay zekâdan aldığı her anlamlı yardımı bu günlüğe işler. "Açıklar mı?" sütunu "E" olmayan hiçbir kod parçası teslim edilemez.

**KVKK:** Yapay zekâ aracına gerçek kişisel veri girilmemiştir. Projedeki tüm kullanıcılar sentetiktir ("Deneme Kullanıcı 01", `@example.com` e-postaları); POI'ler herkese açık turistik mekânlardır.

> "Açıklar mı? (E/H)" sütunu öğrencinin kendi beyanıdır.

| Tarih | Araç | Amaç/Görev | İstem (özet) | Öğrencinin değişikliği / doğrulaması | Açıklar mı? (E/H) |
|---|---|---|---|---|---|
| 05.11.2026 | Claude (Anthropic) | POI/ilgi modeli | Hafta 6 görev kartını gönderdim; POI ve ilgi profili modeli istedim. | Kategori (1-N) ile etiketin (N-N) neden ayrı tutulduğunu ve ilgi düzeyinin (1–5) ara tabloda durduğunu `005` migration'ından inceledim. |  |
| 05.11.2026 | Claude (Anthropic) | Kategori/etiket | Kategori ve etiket filtreleri, etiket yönetimi istedim. | Keşfet filtrelerini ve çoklu etiket filtresinin mantığını okudum. |  |
| 05.11.2026 | Claude (Anthropic) | Konum | Yakınımdakiler araması ve şehir sınırı kuralı istedim. | Haversine mesafe hesabını `utils/geo.js` üzerinden inceledim. |  |
| 05.11.2026 | Claude (Anthropic) | İş kuralları ve doğrulama | Modül için iş kuralları ve doğrulama örnekleri istedim. | K1–K8 ve P1–P5 kural tablolarını okudum; kullanılan POI'nin silinmeyip pasifleştirilme gerekçesini öğrendim. Claude 42 test çalıştırdı, hepsi geçti. |  |
| 05.11.2026 | Claude (Anthropic) | Entegrasyon | Profile göre puanlı öneri listesi istedim. | `/api/pois/for-me` puan formülünü ve gerekçe alanını inceledim. |  |
| 05.11.2026 | Claude (Anthropic) | Rapor ve yükleme | Modül açıklaması, haftalık rapor ve GitHub'a yükleme istedim. | `docs/moduller/poi-katalogu-ilgi-profili.md` dosyasını ve `hafta-6` dalını kontrol ettim. |  |

Haftanın raporu: [rapor.md](rapor.md)
