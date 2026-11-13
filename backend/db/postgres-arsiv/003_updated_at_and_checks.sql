-- Migration 003: Mevcut şemayı değiştiren (ALTER) örnek migration
-- 1) Rotalara "son güncellenme" zamanı
-- 2) E-postanın her zaman küçük harfle ve geçerli biçimde saklanması
-- 3) Tetikleyici (trigger) ile updated_at'in otomatik güncellenmesi

ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_email_format;
ALTER TABLE users ADD CONSTRAINT chk_users_email_format
  CHECK (email = lower(email) AND email LIKE '%_@_%._%');

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trips_updated_at ON trips;
CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
