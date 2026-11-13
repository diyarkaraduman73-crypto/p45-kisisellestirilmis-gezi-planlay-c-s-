-- Migration 005: POI Kataloğu ve İlgi Profili modülü (Hafta 6)

-- ---------- Konum: şehir merkezi ve hizmet yarıçapı ----------
-- İş kuralı: bir POI, bağlı olduğu şehrin merkezine radius_km'den uzak olamaz
-- (yanlış koordinat girilip POI'nin denize/başka şehre düşmesini engeller).
ALTER TABLE cities ADD COLUMN IF NOT EXISTS center_lat DOUBLE PRECISION;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS center_lng DOUBLE PRECISION;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS radius_km  SMALLINT NOT NULL DEFAULT 50;
ALTER TABLE cities DROP CONSTRAINT IF EXISTS chk_cities_radius;
ALTER TABLE cities ADD CONSTRAINT chk_cities_radius CHECK (radius_km BETWEEN 1 AND 300);
UPDATE cities SET center_lat = 41.0082, center_lng = 28.9784, radius_km = 60
WHERE name = 'İstanbul' AND center_lat IS NULL;

-- ---------- POI: ilçe, adres, aktiflik, kim ekledi, ne zaman güncellendi ----------
ALTER TABLE pois ADD COLUMN IF NOT EXISTS district   VARCHAR(80);
ALTER TABLE pois ADD COLUMN IF NOT EXISTS address    VARCHAR(200);
-- Gezi planlarında kullanılan POI silinemez (FK); bunun yerine pasifleştirilir (soft delete).
ALTER TABLE pois ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE pois ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE pois ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pois ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_pois_updated_at ON pois;
CREATE TRIGGER trg_pois_updated_at BEFORE UPDATE ON pois
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- İş kuralı: aynı şehirde aynı adlı iki POI olamaz (büyük/küçük harf duyarsız)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pois_city_name ON pois (city_id, lower(name));
-- Yakınlık aramasında kutu (bounding box) ön filtresi için
CREATE INDEX IF NOT EXISTS idx_pois_lat_lng ON pois (lat, lng);
-- Herkese açık listeler yalnızca aktif POI'leri okur
CREATE INDEX IF NOT EXISTS idx_pois_active_city ON pois (city_id) WHERE is_active;

-- ---------- Etiketler (tags) ----------
-- Kategori (interest) bir POI'nin TEK ana türüdür (1-N).
-- Etiket ise serbest, çoklu özelliktir: "boğaz", "gün batımı", "aile dostu" (N-N).
CREATE TABLE IF NOT EXISTS tags (
  id    SERIAL PRIMARY KEY,
  slug  VARCHAR(40) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name  VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS poi_tags (
  poi_id  INTEGER NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (poi_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_poi_tags_tag ON poi_tags (tag_id);

-- ---------- İlgi profili: ilgi düzeyi (ağırlık) ----------
-- 1 = biraz ilgileniyorum ... 5 = çok ilgileniyorum. Öneri puanlamasında kullanılır.
ALTER TABLE user_interests ADD COLUMN IF NOT EXISTS weight SMALLINT NOT NULL DEFAULT 3;
ALTER TABLE user_interests DROP CONSTRAINT IF EXISTS chk_user_interests_weight;
ALTER TABLE user_interests ADD CONSTRAINT chk_user_interests_weight CHECK (weight BETWEEN 1 AND 5);
