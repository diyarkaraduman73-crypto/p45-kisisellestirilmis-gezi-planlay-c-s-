# Ara Sürüm Demo Senaryosu (v0.8.0)

**Süre:** yaklaşık 5 dakika · **Amaç:** kullanıcı + veritabanı + çekirdek modüllerin uçtan uca birlikte çalıştığını göstermek.

## Hazırlık (sunumdan önce)

```bash
cd backend
npm run db:migrate && npm run db:seed -- --reset
npm run dev                   # http://localhost:4000/api/health → "version": "0.8.0", "database": "postgres"
# ikinci terminal
cd frontend && npm run dev    # http://localhost:5173
```

Yayındaki sürümle sunacaksan Render sunucusunu 1–2 dakika önce bir kez aç (uyku modundan uyansın).

## Akış

| # | Ekranda yapılan | Gösterilen entegrasyon | Söylenecek tek cümle |
|---|---|---|---|
| 1 | Üst çubukta **v0.8.0** rozetinin üzerine gel | Arayüz ↔ API ↔ veritabanı | "Arayüz, API ve veritabanı aynı sürümde ve bağlı; sürüm farkı olsaydı rozet turuncu olurdu." |
| 2 | **Keşfet**: haritada POI'ler, "Tarih" filtresi | Katalog (Modül A) ← PostgreSQL | "Veriler artık bellekte değil, veritabanından geliyor." |
| 3 | **Kayıt ol**: yeni sentetik kullanıcı (`demo@example.com`) | Kimlik doğrulama (H5) → `users`, `sessions` | "Parola özetlenip saklanıyor, oturum token'la yönetiliyor." |
| 4 | **Planla** sayfasını aç | Modül B, Modül A'ya bağlı | "Profilde ilgi yokken plan üretilmiyor, beni Profilim'e yönlendiriyor (R5)." |
| 5 | **Profilim**: Tarih 5, Manzara 4, Doğa 2 → Kaydet | İlgi profili (Modül A) | "İlgi düzeyleri puanlamada çarpan olarak kullanılıyor." |
| 6 | **Planla**: 2 gün, 09:00–19:00, Normal, "mutlaka" Emirgan Korusu → **Plan üret** | Profil + katalog → planlayıcı | "Her gün farklı bölgede; saatler, yol süreleri, öğle arası hesaplı." |
| 7 | Başlangıç tarihi olarak **5 Aralık** seç | Hafta 8 düzeltmesi (tarih kayması) | "Önceden Türkiye saatinde çalışan sunucuda bu tarih 4 Aralık görünüyordu." |
| 8 | **Kaydet** → rota detayı | Tek transaction'da `trips` → `day_plans` → `day_plan_items` | "Kaydedilen plan sunucuda yeniden üretiliyor, önizlemeyle aynı (R9). Tarih de doğru günde: 5 Aralık." |
| 9 | "Bağlantıya sahip herkes görebilsin" → bağlantıyı gizli pencerede aç | Yetki + paylaşım | "Giriş yokken görünüyor ama sahibi ve otel konumu gizli (R11)." |
| 10 | **Yenile** → eski bağlantıyı tekrar aç | Paylaşım kodu yenileme | "Eski bağlantı artık 'bulunamadı'." |
| 11 | **Rotalarım** | Kullanıcıya göre sorgu, sahiplik | "Yalnızca kendi rotalarımı görüyorum; başkasınınkini isteyen 403 alır." |

## Hızlı yedek

Bir adım takılırsa:
- Hazır paylaşılmış demo rota: `#/paylasim/demo011`
- Hazır kullanıcı: `kullanici01@example.com` / `Deneme1234!`
- Geçersiz tarih düzeltmesini göstermek (tarayıcının tarih kutusu 30 Şubat'a izin vermediği için API'den): giriş yaptıktan sonra uçtan uca testin 6. adımı `startDate: '2026-02-30'` gönderir ve 400 bekler.
- Uçtan uca testi canlı çalıştırarak göstermek: `cd backend && npm run test:entegrasyon` (10 adım, aynı akışı API üzerinden doğrular).
