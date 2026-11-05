-- =====================================================================
-- P45 Kişiselleştirilmiş Gezi Planlayıcı - Veri modeli (PostgreSQL / Neon)
-- Hafta 3: Kullanıcı, İlgi, POI, Rota (trip), Gün planı varlıkları
-- Normalizasyon: 3NF (ayrıntılar docs/veri-modeli.md)
-- =====================================================================

-- ---------- Kullanıcı ----------
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  full_name      VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 1-1: Her kullanıcının en fazla bir tercih kaydı vardır (PK aynı zamanda FK)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  budget         VARCHAR(10) NOT NULL DEFAULT 'orta'   CHECK (budget IN ('dusuk','orta','yuksek')),
  pace           VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (pace   IN ('sakin','normal','yogun')),
  language       VARCHAR(5)  NOT NULL DEFAULT 'tr'
);

-- ---------- İlgi alanı ----------
CREATE TABLE IF NOT EXISTS interests (
  id    SERIAL PRIMARY KEY,
  slug  VARCHAR(30) NOT NULL UNIQUE,
  name  VARCHAR(60) NOT NULL
);

-- N-N: Kullanıcı <-> İlgi (ara tablo, bileşik birincil anahtar)
CREATE TABLE IF NOT EXISTS user_interests (
  user_id      INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  interest_id  INTEGER NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);

-- ---------- Şehir ----------
-- Şehir adı her POI/rotada metin olarak tekrarlanmasın diye ayrı tablo (3NF)
CREATE TABLE IF NOT EXISTS cities (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(80) NOT NULL,
  country  VARCHAR(80) NOT NULL,
  UNIQUE (name, country)
);

-- ---------- POI (ilgi noktası) ----------
-- 1-N: Bir şehirde çok POI; bir ilgi alanında çok POI
CREATE TABLE IF NOT EXISTS pois (
  id             SERIAL PRIMARY KEY,
  city_id        INTEGER NOT NULL REFERENCES cities(id),
  interest_id    INTEGER NOT NULL REFERENCES interests(id),
  name           VARCHAR(120) NOT NULL,
  description    TEXT,
  lat            DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng            DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  visit_minutes  SMALLINT NOT NULL DEFAULT 60 CHECK (visit_minutes > 0),
  price_level    SMALLINT NOT NULL DEFAULT 0  CHECK (price_level BETWEEN 0 AND 3)
);
CREATE INDEX IF NOT EXISTS idx_pois_city_interest ON pois(city_id, interest_id);

-- ---------- Rota (gezi) ----------
-- 1-N: Bir kullanıcının çok rotası olabilir
CREATE TABLE IF NOT EXISTS trips (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city_id     INTEGER NOT NULL REFERENCES cities(id),
  title       VARCHAR(120) NOT NULL,
  start_date  DATE,
  day_count   SMALLINT NOT NULL CHECK (day_count BETWEEN 1 AND 14),
  share_code  VARCHAR(12) UNIQUE,               -- Kaydet/paylaş modülü
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Gün planı ----------
-- 1-N: Bir rota, gün sayısı kadar gün planından oluşur
CREATE TABLE IF NOT EXISTS day_plans (
  id          SERIAL PRIMARY KEY,
  trip_id     INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number  SMALLINT NOT NULL CHECK (day_number >= 1),
  summary     TEXT,                              -- yapay zekâ özet notu
  UNIQUE (trip_id, day_number)
);

-- N-N: Gün planı <-> POI (sıralı durak listesi)
CREATE TABLE IF NOT EXISTS day_plan_items (
  id            SERIAL PRIMARY KEY,
  day_plan_id   INTEGER NOT NULL REFERENCES day_plans(id) ON DELETE CASCADE,
  poi_id        INTEGER NOT NULL REFERENCES pois(id),
  visit_order   SMALLINT NOT NULL CHECK (visit_order >= 1),
  start_time    TIME,
  note          TEXT,
  UNIQUE (day_plan_id, visit_order)
);
