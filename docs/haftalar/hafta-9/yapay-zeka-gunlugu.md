# Kişiselleştirilmiş Gezi Planlayıcı
## Yapay Zekâ Kullanım Günlüğü · Hafta 9

| Alan | Bilgi |
|---|---|
| Öğrenci | Diyar Karaduman |
| Numara | 251161035 |
| Proje (Kod/Ad) | P45 · Kişiselleştirilmiş Gezi Planlayıcı |
| Hafta No | 9 · Harici API Entegrasyonu: Harita |
| Depo | [p45-kisisellestirilmis-gezi-planlay-c-s-](https://github.com/diyarkaraduman73-crypto/p45-kisisellestirilmis-gezi-planlay-c-s-) |

**İlke:** Öğrenci, yapay zekâdan aldığı her anlamlı yardımı bu günlüğe işler. "Açıklar mı?" sütunu "E" olmayan hiçbir kod parçası teslim edilemez.

**KVKK ve gizli bilgi:** Yapay zekâ aracıyla API anahtarı paylaşılmamıştır; testlerde sahte anahtar (`test-anahtari-123`) kullanılmıştır. Servise yalnızca turistik mekânların koordinatları gönderilir.

> "Açıklar mı? (E/H)" sütunu öğrencinin kendi beyanıdır.

| Tarih | Araç | Amaç/Görev | İstem (özet) | Öğrencinin değişikliği / doğrulaması | Açıklar mı? (E/H) |
|---|---|---|---|---|---|
| 26.11.2026 | Claude (Anthropic) | API dokümantasyonunu çözümlemek | Hafta 9 görev kartını gönderdim; rotayı harita servisiyle entegre etmesini istedim. | Claude servisleri karşılaştırdı (openrouteservice, Google, OSRM) ve güncel duyuruları aradı: eski `api.openrouteservice.org` adresinin 24.11.2026'da kapandığını, yenisinin `api.heigit.org/openrouteservice` olduğunu buldu. Ücretsiz sınırları (2000/gün, 40/dk) servis sayfasından aldı. |  |
| 26.11.2026 | Claude (Anthropic) | Örnek istek/yanıt incelemek | Directions uç noktasının isteği ve GeoJSON yanıtının yapısı | Örnek `curl` isteği rapora kondu; kendi anahtarımla deneyip yanıttaki `way_points` ve `summary` alanlarını `parseOrsGeojson` ile eşleştireceğim. |  |
| 26.11.2026 | Claude (Anthropic) | Hata yönetimi | Zaman aşımı, yeniden deneme, hız sınırı | `httpClient.js`, `rateLimit.js`, `routingService.js` yazıldı. 16 birim testi sahte servisle geçti (zaman aşımı, 429, 403, bozuk yanıt, önbellek, sınır). Rapordaki 4. soruda hata türlerini kendi cümlelerimle anlattım. |  |
| 26.11.2026 | Claude (Anthropic) | Anahtar yönetimi | Anahtarı güvenli saklama | Anahtarın Vercel'e (`VITE_`) neden konmadığını rapordaki 3. sorudan okudum. `ORS_API_KEY`'i `.env` ve Render'a kendim gireceğim; anahtarı Claude'la paylaşmayacağım. |  |
| 26.11.2026 | Claude (Anthropic) | Arayüz | Gerçek yolu haritada çizme | `TripView` (günü bir kez ister) ve `RouteMap` (yürüyüş düz, toplu taşıma kesikli) değiştirildi. Tarayıcıda anahtarlı ve anahtarsız iki durumu kendim deneyeceğim. |  |

Haftanın raporu: [rapor.md](rapor.md)
