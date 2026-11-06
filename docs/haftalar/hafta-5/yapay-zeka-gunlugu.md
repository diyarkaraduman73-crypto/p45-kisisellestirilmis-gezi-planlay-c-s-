# Kişiselleştirilmiş Gezi Planlayıcı
## Yapay Zekâ Kullanım Günlüğü · Hafta 5

| Alan | Bilgi |
|---|---|
| Öğrenci | Diyar Karaduman |
| Numara | 251161035 |
| Proje (Kod/Ad) | P45 · Kişiselleştirilmiş Gezi Planlayıcı |
| Hafta No | 5 · Kullanıcı Yönetimi ve Kimlik Doğrulama |
| Depo | [p45-kisisellestirilmis-gezi-planlay-c-s-](https://github.com/diyarkaraduman73-crypto/p45-kisisellestirilmis-gezi-planlay-c-s-) |

**İlke:** Öğrenci, yapay zekâdan aldığı her anlamlı yardımı bu günlüğe işler. "Açıklar mı?" sütunu "E" olmayan hiçbir kod parçası teslim edilemez.

**KVKK:** Yapay zekâ aracına gerçek kişisel veri girilmemiştir. Projedeki tüm kullanıcılar sentetiktir ("Deneme Kullanıcı 01", `@example.com` e-postaları); POI'ler herkese açık turistik mekânlardır.

> "Açıklar mı? (E/H)" sütunu öğrencinin kendi beyanıdır.

| Tarih | Araç | Amaç/Görev | İstem (özet) | Öğrencinin değişikliği / doğrulaması | Açıklar mı? (E/H) |
|---|---|---|---|---|---|
| 05.11.2026 | Claude (Anthropic) | Kayıt/giriş akışı | Hafta 5 görev kartını gönderdim; kayıt, giriş, çıkış ve parola değiştirme istedim. | `authService.js` akışını ve giriş/kayıt sayfalarını inceledim. |  |
| 05.11.2026 | Claude (Anthropic) | Parola hash'leme | Güvenli parola saklama yöntemini sordum. | Tuzlu scrypt özetinin nasıl üretilip doğrulandığını `utils/password.js` üzerinden okudum; bcrypt ile farkını öğrendim. |  |
| 05.11.2026 | Claude (Anthropic) | Oturum/token | Oturum ile JWT farkını ve çıkışın nasıl yapılacağını sordum. | JWT + `sessions` tablosu birleşiminin çıkışta token'ı nasıl geçersiz kıldığını inceledim. |  |
| 05.11.2026 | Claude (Anthropic) | Rol tabanlı erişim | Gezgin ve yönetici rolleri, korumalı sayfalar istedim. | `requireAuth` (401) ve `requireRole` (403) ara katmanlarını ve sahiplik kontrollerini okudum. Claude 38 kimlik/yetki testi çalıştırdı, hepsi geçti. |  |
| 05.11.2026 | Claude (Anthropic) | Güvenlik notu | Kısa güvenlik notu ve yaygın açıkların (OWASP) açıklamasını istedim. | `docs/guvenlik-notu.md` dosyasını okudum; başarısız girişte hesap kilitleme kuralını öğrendim. |  |
| 05.11.2026 | Claude (Anthropic) | Rapor ve yükleme | Haftalık rapor ve GitHub'a yükleme istedim. | `hafta-5` dalını GitHub'da kontrol ettim; demo hesaplarını not ettim. |  |

Haftanın raporu: [rapor.md](rapor.md)
