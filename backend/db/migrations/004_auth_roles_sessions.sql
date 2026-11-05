-- Migration 004: Kimlik doğrulama ve rol tabanlı erişim (Hafta 5)

-- 1) Rol: gezgin (varsayılan) veya yonetici
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'gezgin';
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('gezgin', 'yonetici'));

-- 2) Kaba kuvvet (brute force) koruması: art arda başarısız girişte hesap geçici kilitlenir
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 3) Oturumlar: her JWT'nin kimliği (jti) burada tutulur.
--    Token imzası geçerli olsa bile oturum iptal edilmiş/süresi dolmuşsa erişim reddedilir.
--    Böylece "çıkış yap" ve "şifre değişince diğer cihazlardan at" mümkün olur.
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY,                                   -- JWT'deki jti
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  user_agent  VARCHAR(255),
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
