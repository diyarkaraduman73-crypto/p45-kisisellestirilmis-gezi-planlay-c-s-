# Hafta 3 · Kurulum, Mimari ve Veri Modeli

**Amaç:** Geliştirme ortamını kurmak, proje mimarisini ve veri modelini tasarlamak, GitHub deposunu oluşturmak.
**Modül:** Proje iskeleti ve depo yapısı

## Yapılanlar

- [x] Teknoloji yığını seçildi ve kuruldu: Node.js 18+, Express, PostgreSQL (Neon), React + Vite, Leaflet/OpenStreetMap
- [x] Katmanlı klasör yapısı: `frontend/` ve `backend/` ayrı; backend'de routes/controllers → services → repositories
- [x] GitHub deposu, `.gitignore`, `README.md`, `.env.example` dosyaları
- [x] ER diyagramı (kullanıcı, ilgi, POI, rota, gün planı) → [veri-modeli.md](../veri-modeli.md)
- [x] Mimari şema → [mimari.md](../mimari.md)
- [x] Çalışan iskele: `/api/health`, `/api/interests`, `/api/pois`; arayüzde ilgi alanı seçimi ve POI haritası
- [x] 3NF veritabanı şeması ve seed betiği (`npm run db:init`)

## Teslim edilen çıktılar

| Çıktı | Yer |
|---|---|
| README + .gitignore | Depo kökü |
| ER diyagramı | `docs/veri-modeli.md` |
| Mimari şema | `docs/mimari.md` |
| Veritabanı şeması | `backend/db/schema.sql` |

## Gösterilecek ilerleme (demo adımları)

1. Depoyu ve klasör yapısını göster (`frontend/`, `backend/src/{routes,controllers,services,repositories}`).
2. `cd backend && npm install && npm run dev` → tarayıcıda `http://localhost:4000/api/health`.
3. `cd frontend && npm install && npm run dev` → `http://localhost:5173`, ilgi alanı seç, haritada POI'ler filtrelenir.
4. GitHub'da `docs/veri-modeli.md` aç: ER diyagramı otomatik çizilir.

## Yapay zekâ kullanımı

Yapay zekâ; katmanlı mimari / MVC / mikroservis alternatiflerini karşılaştırmak, klasör yapısı önerisi almak ve ER diyagramı için varlık-ilişki önerisi almak amacıyla kullanıldı. Öneriler kontrol edildi; örneğin ilk taslaktaki `interests TEXT[]` dizisinin 1NF'yi bozduğu fark edilerek ara tabloya dönüştürüldü ve şehir bilgisi 3NF için ayrı tabloya alındı.

## Öğrencinin kendi geliştireceği bölümler

> Bu kısımları kendi cümlelerinle yaz/gözden geçir; sözlü sınavda gerekçelendirmen beklenir.

- **Varlık ve ilişkileri tanımlama:** ER diyagramındaki her varlığın neden var olduğunu ve her ilişkinin türünü (1-1, 1-N, N-N) açıklayabilmelisin. İstersen kendi eklemelerini yap (ör. POI açılış saatleri, kullanıcı yorumları).
- **Klasör/katman gerekçesi:** `docs/mimari.md` içindeki "Neden katmanlı mimari?" bölümünü kendi sözlerinle düzenle.

## Sözlü sınav hazırlığı

**1) Katmanlı mimariyi neden tercih ettin?**
Her katmanın tek sorumluluğu var: sunum HTTP'yi, iş katmanı kuralları, veri katmanı SQL'i yönetiyor. Bu sayede veritabanı değişse sadece repository değişiyor (şu an DB yokken seed verisiyle çalışabilmesi bunun kanıtı), servisler HTTP'siz test edilebiliyor ve rota üretimi/yapay zekâ gibi büyüyen mantık controller'ları şişirmiyor. Arayüz ayrı React uygulaması olduğu için MVC'nin "view" kısmına ihtiyaç yok; mikroservis ise bu ölçek için fazla karmaşık.

**2) İlişki türlerini örnekle açıkla.**
- 1-1: Kullanıcı ↔ Tercihler (`user_preferences.user_id` hem PK hem FK).
- 1-N: Bir kullanıcının çok rotası olur; FK "çok" tarafta (`trips.user_id`). Aynı şekilde Rota → Gün planları.
- N-N: Kullanıcı ↔ İlgi (bir kullanıcı çok ilgi seçer, bir ilgi çok kullanıcıda bulunur) → `user_interests` ara tablosu. Gün planı ↔ POI → `day_plan_items` (sıra ve saat bilgisini de taşır).

**3) Hangi varlıklar birincil anahtar taşıyor ve neden?**
Tüm tablolar PK taşır, çünkü her satırın benzersiz ve değişmez biçimde tanımlanması ve FK ile referans verilebilmesi gerekir. Bağımsız varlıklarda yapay `SERIAL id` kullanıldı (e-posta/ad değişebilir). `user_interests`'te bileşik PK `(user_id, interest_id)` tekrar eklemeyi engeller; `user_preferences`'ta PK = `user_id`, 1-1'i garanti eder.

**4) Klasör yapını hangi mantıkla kurdun?**
Önce dağıtım birimine göre (`frontend/` → Vercel, `backend/` → Render; ayrı kurulup ayrı yayınlanırlar), sonra katmana göre (`routes`/`controllers` → `services` → `repositories`). Ortak yardımcılar `middleware/`, yapılandırma `config/`, SQL şeması `db/`, belgeler `docs/` altında.

**5) .gitignore neden gerekli, neler eklenmemeli?**
Depoya yalnızca kaynak kod girmeli. `node_modules/` (çok büyük, `npm install` ile yeniden kurulur), `dist/` (derleme çıktısı), loglar, editör/OS dosyaları ve en önemlisi `.env` (veritabanı şifresi, API anahtarları) eklenmez. Gizli bilgi bir kez commit edilirse geçmişte kalır; bu yüzden yerine değersiz örnek değerler içeren `.env.example` paylaşılır.

## Teorik kavramlar (kısa)

- **Birincil anahtar (PK):** Satırı benzersiz tanımlar, boş olamaz. **Yabancı anahtar (FK):** Başka tablonun PK'sına başvurur, referans bütünlüğünü sağlar.
- **1NF:** Atomik değerler, tekrar eden grup yok. **2NF:** 1NF + kısmi bağımlılık yok. **3NF:** 2NF + geçişli bağımlılık yok.
- **Sürüm kontrolü:** Her hafta ayrı commit ve `hafta-N` etiketi; değişiklik geçmişi ve geri dönüş imkânı.

## Sık yapılan hatalar ve bu projede alınan önlem

| Hata | Önlem |
|---|---|
| Her şeyi tek katmanda toplamak | routes/controllers/services/repositories ayrımı |
| İlişki ve anahtarları eksik tasarlamak | Tüm FK'ler, UNIQUE ve CHECK kısıtları şemada tanımlı |
| Depoya gereksiz/gizli dosya yüklemek | `.gitignore` + `.env.example` |
