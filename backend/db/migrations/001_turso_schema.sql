-- Migration 001 (Turso / SQLite): Tüm şema tek dosyada.
-- PostgreSQL sürümündeki 001–006 migration'larının (db/postgres-arsiv/) SQLite karşılığıdır.
--
-- PostgreSQL → SQLite farkları:
--   SERIAL                → INTEGER PRIMARY KEY AUTOINCREMENT
--   TIMESTAMPTZ / NOW()   → ISO metin: strftime('%Y-%m-%dT%H:%M:%fZ','now')
--   DATE / TIME           → 'YYYY-MM-DD' / 'HH:MM' metin
--   BOOLEAN               → INTEGER 0/1
--   plpgsql trigger       → SQLite trigger (AFTER UPDATE)
--   regex CHECK (~)       → GLOB
-- Yabancı anahtar (REFERENCES) tanımları belge niteliğinde korunur; silme işlemlerinde bağlı
-- kayıtlar uygulama tarafından açıkça silinir (bkz. src/config/db.js notu).

-- ---------- Kullanıcı ----------
CREATE TABLE IF NOT EXISTS users (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name           TEXT NOT NULL CHECK (length(full_name) <= 100),
  email               TEXT NOT NULL UNIQUE CHECK (email = lower(email) AND email LIKE '%_@_%._%'),
  password_hash       TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'gezgin' CHECK (role IN ('gezgin', 'yonetici')),
  failed_login_count  INTEGER NOT NULL DEFAULT 0,
  locked_until        TEXT,
  last_login_at       TEXT,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 1-1: Her kullanıcının en fazla bir tercih kaydı (PK aynı zamanda FK)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  budget    TEXT NOT NULL DEFAULT 'orta'   CHECK (budget IN ('dusuk','orta','yuksek')),
  pace      TEXT NOT NULL DEFAULT 'normal' CHECK (pace   IN ('sakin','normal','yogun')),
  language  TEXT NOT NULL DEFAULT 'tr'
);

-- ---------- İlgi alanı ----------
CREATE TABLE IF NOT EXISTS interests (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  slug  TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL
);

-- N-N: Kullanıcı <-> İlgi (bileşik birincil anahtar, ilgi düzeyi 1-5)
CREATE TABLE IF NOT EXISTS user_interests (
  user_id      INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  interest_id  INTEGER NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  weight       INTEGER NOT NULL DEFAULT 3 CHECK (weight BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, interest_id)
);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON user_interests (interest_id);

-- ---------- Şehir ----------
CREATE TABLE IF NOT EXISTS cities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  country     TEXT NOT NULL,
  center_lat  REAL,
  center_lng  REAL,
  radius_km   INTEGER NOT NULL DEFAULT 50 CHECK (radius_km BETWEEN 1 AND 300),
  UNIQUE (name, country)
);

-- ---------- POI ----------
CREATE TABLE IF NOT EXISTS pois (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  city_id        INTEGER NOT NULL REFERENCES cities(id),
  interest_id    INTEGER NOT NULL REFERENCES interests(id),
  name           TEXT NOT NULL,
  description    TEXT,
  district       TEXT,
  address        TEXT,
  lat            REAL NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng            REAL NOT NULL CHECK (lng BETWEEN -180 AND 180),
  visit_minutes  INTEGER NOT NULL DEFAULT 60 CHECK (visit_minutes > 0),
  price_level    INTEGER NOT NULL DEFAULT 0  CHECK (price_level BETWEEN 0 AND 3),
  is_active      INTEGER NOT NULL DEFAULT 1  CHECK (is_active IN (0, 1)),   -- soft delete
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_pois_city_interest ON pois (city_id, interest_id);
CREATE INDEX IF NOT EXISTS idx_pois_interest ON pois (interest_id);
CREATE INDEX IF NOT EXISTS idx_pois_lat_lng ON pois (lat, lng);
CREATE INDEX IF NOT EXISTS idx_pois_active_city ON pois (city_id) WHERE is_active = 1;
-- Aynı şehirde aynı adlı iki POI olamaz (büyük/küçük harf duyarsız)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pois_city_name ON pois (city_id, lower(name));

CREATE TRIGGER IF NOT EXISTS trg_pois_updated_at AFTER UPDATE ON pois
FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE pois SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

-- ---------- Etiketler ----------
CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  slug  TEXT NOT NULL UNIQUE
        CHECK (length(slug) BETWEEN 1 AND 40 AND slug NOT GLOB '*[^a-z0-9-]*'
               AND slug NOT GLOB '-*' AND slug NOT GLOB '*-' AND slug NOT GLOB '*--*'),
  name  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS poi_tags (
  poi_id  INTEGER NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (poi_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_poi_tags_tag ON poi_tags (tag_id);

-- ---------- Rota (gezi) ----------
CREATE TABLE IF NOT EXISTS trips (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city_id     INTEGER NOT NULL REFERENCES cities(id),
  title       TEXT NOT NULL,
  start_date  TEXT,                                   -- 'YYYY-MM-DD'
  day_count   INTEGER NOT NULL CHECK (day_count BETWEEN 1 AND 14),
  share_code  TEXT UNIQUE,
  is_public   INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  generated   INTEGER NOT NULL DEFAULT 0 CHECK (generated IN (0, 1)),
  pace        TEXT CHECK (pace IS NULL OR pace IN ('sakin', 'normal', 'yogun')),
  day_start   TEXT,                                   -- 'HH:MM'
  day_end     TEXT,
  start_lat   REAL,
  start_lng   REAL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  -- gün en az 3 saat sürmeli
  CHECK (day_start IS NULL OR day_end IS NULL OR time(day_start, '+3 hours') <= day_end OR day_start > '21:00'),
  CHECK ((start_lat IS NULL) = (start_lng IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_trips_user_created ON trips (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_city ON trips (city_id);
CREATE INDEX IF NOT EXISTS idx_trips_public_share ON trips (share_code) WHERE is_public = 1;

CREATE TRIGGER IF NOT EXISTS trg_trips_updated_at AFTER UPDATE ON trips
FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE trips SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

-- ---------- Gün planı ----------
CREATE TABLE IF NOT EXISTS day_plans (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id     INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number  INTEGER NOT NULL CHECK (day_number >= 1),
  summary     TEXT,
  UNIQUE (trip_id, day_number)
);

-- N-N: Gün planı <-> POI (sıralı durak listesi)
CREATE TABLE IF NOT EXISTS day_plan_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  day_plan_id     INTEGER NOT NULL REFERENCES day_plans(id) ON DELETE CASCADE,
  poi_id          INTEGER NOT NULL REFERENCES pois(id),
  visit_order     INTEGER NOT NULL CHECK (visit_order >= 1),
  start_time      TEXT,                               -- 'HH:MM'
  end_time        TEXT,
  travel_minutes  INTEGER CHECK (travel_minutes IS NULL OR travel_minutes >= 0),
  travel_km       REAL    CHECK (travel_km IS NULL OR travel_km >= 0),
  travel_mode     TEXT    CHECK (travel_mode IS NULL OR travel_mode IN ('yuruyus', 'toplu-tasima')),
  note            TEXT,
  UNIQUE (day_plan_id, visit_order),
  CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_day_plan_items_poi ON day_plan_items (poi_id);
-- Bir POI aynı gün içinde iki kez yer alamaz
CREATE UNIQUE INDEX IF NOT EXISTS uq_items_day_poi ON day_plan_items (day_plan_id, poi_id);

-- ---------- Oturumlar (JWT jti) ----------
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,                       -- JWT'deki jti (UUID)
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT,
  user_agent  TEXT,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
