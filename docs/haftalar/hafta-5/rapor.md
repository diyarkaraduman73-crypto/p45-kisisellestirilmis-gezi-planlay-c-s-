# Hafta 5 · Kullanıcı Yönetimi ve Kimlik Doğrulama

**Amaç:** Kayıt, giriş ve rol tabanlı erişim ile kullanıcı yönetimini kurmak.
**Modül:** Kimlik doğrulama ve kullanıcı/rol

## Yapılanlar

- [x] **Kayıt / giriş akışı:** `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me`, parola değiştirme `POST /api/auth/password`
- [x] **Parola hash'leme:** kullanıcı başına rastgele tuzlu scrypt; parola politikası (8+ karakter, harf + rakam)
- [x] **Oturum / token yönetimi:** HMAC-SHA256 imzalı JWT (120 dk) + `sessions` tablosu → çıkışta, parola değişiminde ve hesap kilitlenince oturum iptali
- [x] **Rol tabanlı erişim (gezgin / yönetici):** `requireAuth`, `requireRole` middleware'leri ve servislerde sahiplik kontrolü
- [x] **Başarısız giriş koruması:** 5 hatalı denemede 15 dk kilit, genel hata mesajı, sabit süreli doğrulama
- [x] **Arayüz:** Giriş, Kayıt, Rotalarım (giriş gerekli), Yönetim paneli (yalnızca yönetici), 403 sayfası, oturum süresi dolunca otomatik çıkış
- [x] Migration `004_auth_roles_sessions.sql`, seed'e yönetici hesabı
- [x] [Güvenlik notu](../../guvenlik-notu.md)

## Teslim edilen çıktılar

| Çıktı | Yer |
|---|---|
| Çalışan kayıt/giriş | `backend/src/services/authService.js`, `frontend/src/pages/LoginPage.jsx`, `RegisterPage.jsx` |
| Rol tabanlı erişim | `backend/src/middleware/auth.js`, `routes/*.js`, `frontend/src/components/ProtectedRoute.jsx` |
| Kısa güvenlik notu | `docs/guvenlik-notu.md` |

## Test sonuçları

Gerçek PostgreSQL üzerinde 38 kimlik doğrulama/yetki testi çalıştırıldı, hepsi geçti. Öne çıkanlar:

| Senaryo | Sonuç |
|---|---|
| Kayıtta `role: "yonetici"` gönderilse de hesap `gezgin` açılıyor | ✔ |
| Veritabanında parola düz metin değil (`scrypt$tuz$özet`) | ✔ |
| Olmayan e-posta ve yanlış parola aynı mesajı veriyor | ✔ |
| 5. hatalı denemede hesap kilitleniyor (429), kilitliyken doğru parola da reddediliyor | ✔ |
| İçeriği değiştirilmiş token (rol=yönetici), `alg: none`, süresi dolmuş token reddediliyor | ✔ |
| Çıkıştan sonra aynı token ile istek → 401 | ✔ |
| Parola değişince diğer cihazdaki oturum kapanıyor | ✔ |
| Gezgin → yönetici ucu → 403; girişsiz → 401 | ✔ |
| Gezgin başkasının rotasını açamıyor/silemiyor → 403; yönetici hepsini görebiliyor | ✔ |
| Yönetici rol verince/alınca yetki aynı token ile hemen değişiyor | ✔ |
| Son yönetici silinemiyor, yönetici kendi yetkisini kaldıramıyor | ✔ |

## Gösterilecek ilerleme (demo adımları)

1. `backend/.env` içine `JWT_SECRET` üret ve yaz:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
2. `cd backend && npm run db:migrate && npm run db:seed -- --reset && npm run dev`
3. `cd frontend && npm run dev` → `http://localhost:5173`
4. **Kayıt:** "Kayıt ol" → yeni hesap → otomatik giriş, "Rotalarım" açılır. Neon'da `SELECT email, password_hash FROM users` ile parolanın özet olarak durduğunu göster.
5. **Rol bazlı sayfa erişimi:**
   - Çıkış yap, adres çubuğuna `#/rotalarim` yaz → giriş sayfasına yönlendirilir.
   - `kullanici01@example.com` / `Deneme1234!` ile gir → "Yönetim" menüsü görünmez; `#/yonetim` yazınca **403 sayfası**.
   - `yonetici@example.com` / `Deneme1234!` ile gir → Yönetim paneli: kullanıcı rolü değiştir, POI ekle/sil.
6. **Arayüzü atlatma denemesi:** gezgin token'ıyla doğrudan API'ye istek → sunucu yine reddeder:
   ```bash
   curl -X DELETE localhost:4000/api/pois/1 -H "Authorization: Bearer <gezgin-token>"   # 403
   ```
7. **Başarısız giriş:** 5 kez yanlış parola → "Hesap 15 dakika kilitlendi".

## Yapay zekâ kullanımı

Yapay zekâ güvenli kimlik doğrulama desenlerini (JWT + sunucu oturumu, tuzlu parola özetleme) ve yaygın güvenlik açıklarını (kullanıcı keşfi, `alg: none`, IDOR, yalnızca arayüzde yetki kontrolü) araştırmak için kullanıldı. Öneriler testlerle doğrulandı; örneğin rolün token yerine her istekte veritabanından okunması gerektiği, rol değişikliğinin hemen etkili olması testiyle kontrol edildi.

## Öğrencinin kendi geliştireceği bölümler

> Sözlü sınavda bu kısımları kendin anlatabilmelisin.

- **Parola hash ve doğrulama akışını kendin kurmak:** `utils/password.js` içindeki `hashPassword` ve `verifyPassword`'ü satır satır incele; tuzun nereden geldiğini, özetin nasıl saklandığını ve girişte nasıl karşılaştırıldığını kâğıt üzerinde çizebilmelisin. İstersen bcrypt'e geçir (`npm i bcrypt`, `bcrypt.hash(parola, 12)` / `bcrypt.compare`) ve farkı açıkla.
- **Rol kontrolünü en az bir uçta uygulamak:** Önerim: yönetici için `GET /api/admin/stats` ucu ekle (kullanıcı, rota, POI sayıları). `routes/` altında `requireAuth, requireRole('yonetici')` ile koru, gezgin token'ıyla 403 aldığını curl ile göster.

## Sözlü sınav hazırlığı

**1) Parolayı neden hash'liyoruz, tuz (salt) nedir?**
Veritabanı bir gün sızarsa saldırgan parolaları doğrudan okuyamasın diye. Hash tek yönlüdür: özetten parolaya geri dönülmez; girişte girilen parola aynı yöntemle özetlenip karşılaştırılır. **Tuz**, her kullanıcı için üretilen rastgele değerdir ve parolayla birlikte özetlenir. Böylece aynı parolaya sahip iki kullanıcının özeti farklı olur ve önceden hesaplanmış tablolar (rainbow table) işe yaramaz. scrypt/bcrypt gibi bilerek **yavaş** algoritmalar kullanılır ki saniyede milyarlarca deneme yapılamasın.

**2) Oturum ve token farkı nedir?**
*Oturum (session):* Sunucu oturum bilgisini kendinde tutar, istemciye yalnızca bir kimlik (genelde çerez) verir; sunucu istediği an oturumu silebilir. *Token (JWT):* Kullanıcı bilgisi imzalı olarak token'ın içindedir; sunucu bir şey saklamadan imzayı doğrular (durumsuz, ölçeklenebilir) ama süresi dolmadan iptal etmek zordur. Bu projede ikisini birleştirdim: JWT kullanıyorum ama içindeki `jti` ile `sessions` tablosundan oturumun hâlâ geçerli olup olmadığını kontrol ediyorum; böylece çıkış ve zorla oturum kapatma mümkün.

**3) Rol tabanlı erişimi nasıl uyguladın?**
`users.role` sütunu (`gezgin` / `yonetici`, CHECK kısıtlı). İki katmanda kontrol: (a) route seviyesinde `requireAuth` (kim olduğunu doğrular, yoksa 401) ve `requireRole('yonetici')` (yetkisi yoksa 403); (b) servis seviyesinde sahiplik kontrolü: gezgin yalnızca kendi rotasını/profilini görebilir. Rol her istekte veritabanından okunur. Arayüzde de menüler role göre gizlenir ve `ProtectedRoute` yönlendirir, ama asıl koruma sunucuda.

**4) Başarısız giriş denemesinde ne oluyor?**
Kullanıcıya her durumda aynı "E-posta veya parola hatalı" mesajı döner (hangi e-postaların kayıtlı olduğu öğrenilemesin); e-posta yoksa bile sahte bir özetle aynı süre harcanır. Kayıtlı hesapta `failed_login_count` artar; 5'e ulaşınca `locked_until` 15 dk sonrasına ayarlanır, sayaç sıfırlanır ve hesabın açık oturumları kapatılır. Kilit süresince doğru parola da kabul edilmez (429). Başarılı girişte sayaç sıfırlanır.

**5) Yetkisiz kullanıcı korumalı sayfaya giderse ne olur?**
Arayüzde: giriş yapmamışsa `#/giris?sonra=...` sayfasına yönlendirilir, girişten sonra geri döner; giriş yapmış ama rolü yetmiyorsa 403 sayfası görür. Arayüzü atlayıp doğrudan API'ye istek atarsa: token yoksa veya geçersizse **401**, token geçerli ama rol/sahiplik uygun değilse **403** döner ve veri hiç gönderilmez.

## Teorik kavramlar (kısa)

- **Kimlik doğrulama (authentication):** "Sen kimsin?" → giriş, token doğrulama. Başarısızsa 401.
- **Yetkilendirme (authorization):** "Bunu yapmaya iznin var mı?" → rol ve sahiplik. Başarısızsa 403.
- **Hash ve salt:** Tek yönlü özet + kullanıcıya özel rastgele değer.
- **JWT:** `başlık.içerik.imza`; içerik şifreli değil, base64 ile kodlanmış ve imzalı. İçine gizli bilgi konmaz.
- **OWASP Top 10:** En yaygın web güvenlik açıkları listesi; eşleştirme için [güvenlik notu](../../guvenlik-notu.md#5-owasp-top-10-ile-ilişki).

## Sık yapılan hatalar ve alınan önlem

| Hata | Önlem |
|---|---|
| Parolayı düz metin saklamak | Tuzlu scrypt özeti; yanıtlarda özet bile dönmüyor |
| Yetkilendirmeyi yalnızca arayüzde yapmak | Her korumalı uç sunucuda `requireAuth` / `requireRole` / sahiplik kontrolüyle korunuyor |
| Oturum süresini yönetmemek | Token 120 dk, sunucu tarafı oturum kaydı, çıkışta iptal, süre dolunca arayüz kullanıcıyı çıkarıyor |
