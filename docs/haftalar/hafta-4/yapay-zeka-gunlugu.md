# Kişiselleştirilmiş Gezi Planlayıcı
## Yapay Zekâ Kullanım Günlüğü · Hafta 4

| Alan | Bilgi |
|---|---|
| Öğrenci | Diyar Karaduman |
| Numara | 251161035 |
| Proje (Kod/Ad) | P45 · Kişiselleştirilmiş Gezi Planlayıcı |
| Hafta No | 4 · Veritabanı Tasarımı ve Veri Erişim Katmanı |
| Depo | [p45-kisisellestirilmis-gezi-planlay-c-s-](https://github.com/diyarkaraduman73-crypto/p45-kisisellestirilmis-gezi-planlay-c-s-) |

**İlke:** Öğrenci, yapay zekâdan aldığı her anlamlı yardımı bu günlüğe işler. "Açıklar mı?" sütunu "E" olmayan hiçbir kod parçası teslim edilemez.

**KVKK:** Yapay zekâ aracına gerçek kişisel veri girilmemiştir. Projedeki tüm kullanıcılar sentetiktir ("Deneme Kullanıcı 01", `@example.com` e-postaları); POI'ler herkese açık turistik mekânlardır.

> "Açıklar mı? (E/H)" sütunu öğrencinin kendi beyanıdır.

| Tarih | Araç | Amaç/Görev | İstem (özet) | Öğrencinin değişikliği / doğrulaması | Açıklar mı? (E/H) |
|---|---|---|---|---|---|
| 05.11.2026 | Claude (Anthropic) | Migration | Hafta 4 görev kartını gönderdim; tabloların migration ile oluşturulmasını istedim. | `db/migrations/001–003` dosyalarını ve `npm run db:migrate` komutunu inceledim; her dosyanın transaction içinde çalıştığını öğrendim. |  |
| 05.11.2026 | Claude (Anthropic) | İndeks ve kısıtlar | İlişkiler, kısıtlar ve indeks önerisi istedim. | PostgreSQL'in yabancı anahtarlara otomatik indeks eklemediğini ve hangi indekslerin neden eklendiğini `002_indexes.sql` yorumlarından okudum. |  |
| 05.11.2026 | Claude (Anthropic) | Sentetik veri | KVKK'ya uygun örnek veri istedim. | Seed verisinde gerçek kişi olmadığını kontrol ettim: "Deneme Kullanıcı 01–12", `@example.com` e-postaları. |  |
| 05.11.2026 | Claude (Anthropic) | CRUD katmanı | Kullanıcı, rota ve POI için ekleme/okuma/güncelleme/silme fonksiyonları istedim. | Claude gerçek bir PostgreSQL 16 üzerinde 29 test çalıştırdı, hepsi geçti (CASCADE, FK hatası, ROLLBACK dahil). Parametreli sorguların SQL enjeksiyonunu nasıl önlediğini inceledim. |  |
| 05.11.2026 | Claude (Anthropic) | Örnek sorgular | Demo için JOIN, EXPLAIN ve transaction örnekleri istedim. | `db/ornek-sorgular.sql` dosyasını okudum. |  |
| 05.11.2026 | Claude (Anthropic) | Rapor ve yükleme | Haftalık rapor ve GitHub'a yükleme istedim. | `hafta-4` dalını ve raporu GitHub'da kontrol ettim. |  |

Haftanın raporu: [rapor.md](rapor.md)
