# Kişiselleştirilmiş Gezi Planlayıcı
## Yapay Zekâ Kullanım Günlüğü · Hafta 8

| Alan | Bilgi |
|---|---|
| Öğrenci | Diyar Karaduman |
| Numara | 251161035 |
| Proje (Kod/Ad) | P45 · Kişiselleştirilmiş Gezi Planlayıcı |
| Hafta No | 8 · VİZE: Ara Sürüm, Entegrasyon ve Sözlü Hazırlık |
| Sürüm | `v0.8.0` |
| Depo | [p45-kisisellestirilmis-gezi-planlay-c-s-](https://github.com/diyarkaraduman73-crypto/p45-kisisellestirilmis-gezi-planlay-c-s-) |

**İlke:** Öğrenci, yapay zekâdan aldığı her anlamlı yardımı bu günlüğe işler. "Açıklar mı?" sütunu "E" olmayan hiçbir kod parçası teslim edilemez.

**KVKK:** Yapay zekâ aracına gerçek kişisel veri girilmemiştir. Testlerde açılan kullanıcılar sentetiktir (`test-<zaman>@example.com`); veritabanı adresi ve gizli anahtarlar paylaşılmamıştır.

> "Açıklar mı? (E/H)" sütunu öğrencinin kendi beyanıdır.

| Tarih | Araç | Amaç/Görev | İstem (özet) | Öğrencinin değişikliği / doğrulaması | Açıklar mı? (E/H) |
|---|---|---|---|---|---|
| 26.11.2026 | Claude (Anthropic) | Entegrasyon hatalarını ayıklama | Hafta 8 görev kartını gönderdim; ara sürümü hazırlayıp GitHub'a yüklemesini istedim. | Claude kodu inceleyip iki hata buldu: (H1) `DATE` alanının saat dilimi yüzünden bir gün kayması, (H2) `2026-02-30` gibi takvimde olmayan tarihin 500 vermesi. H2'yi PostgreSQL'de `'2026-02-30'::date` ile denedi, hata verdiğini gördü. Kök nedenleri rapordaki tabloda okudum. |  |
| 26.11.2026 | Claude (Anthropic) | Kod düzeltme | Bulunan hataların düzeltilmesi | Değişiklikler: `utils/validate.js` (`optionalDate`), `config/db.js` (tarih ayrıştırıcı), `middleware/errorHandler.js` (22xxx kodları → 400). Her değişikliğin üstünde neden yapıldığını anlatan yorum var. `optionalDate`'i rapordaki 4. soruda satır satır açıkladım. |  |
| 26.11.2026 | Claude (Anthropic) | Temel entegrasyon testi yaklaşımı | Modüllerin birlikte çalıştığını gösteren test | Birim testleri (`npm test`, 13 test) Claude'un ortamında geçti. Uçtan uca test (`npm run test:entegrasyon`, 10 adım) çalışan API ve veritabanı gerektiriyor; Claude'un ortamında paket kurulamadığı için orada çalıştırılamadı, **kendi bilgisayarımda çalıştırıp sonucu rapora yazacağım.** |  |
| 26.11.2026 | Claude (Anthropic) | Sürümleme | Ara sürümü etiketleme, semantic versioning | `0.8.0` seçildi (0 = kararlı API sözü yok). `CHANGELOG.md`, `/api/health` → `version`, arayüzde sürüm rozeti eklendi; Git etiketi `v0.8.0` ve `hafta-8` dalı oluşturuldu. `git tag -a` ile `git checkout v0.8.0` komutlarının ne yaptığını rapordaki teorik kavramlardan okudum. |  |
| 26.11.2026 | Claude (Anthropic) | Demo senaryosu | 5 dakikalık vize demosu | [demo-senaryosu.md](../../demo-senaryosu.md) hazırlandı; "söylenecek tek cümle" sütununu kendi cümlelerimle yeniden yazıp prova edeceğim. |  |
| 26.11.2026 | Claude (Anthropic) | Sözlü sınav hazırlığı | Hafta 8'in 5 sözlü sorusu | Cevaplar rapora yazıldı; "hangi modül hangi veriyi nereden alıyor" tablosunu kodla (`routePlanService.js` içe aktarmaları) karşılaştırarak kontrol edeceğim. |  |

Haftanın raporu: [rapor.md](rapor.md)
