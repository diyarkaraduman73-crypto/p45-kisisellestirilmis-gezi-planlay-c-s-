-- Migration 006: Rota ve Gün Planı Üretimi + Kaydet/Paylaş (Hafta 7)

-- ---------- Rota: üretim parametreleri ve paylaşım ----------
ALTER TABLE trips ADD COLUMN IF NOT EXISTS pace       VARCHAR(10);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS day_start  TIME;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS day_end    TIME;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS start_lat  DOUBLE PRECISION;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS start_lng  DOUBLE PRECISION;
-- Algoritmayla mı üretildi, elle mi oluşturuldu?
ALTER TABLE trips ADD COLUMN IF NOT EXISTS generated  BOOLEAN NOT NULL DEFAULT FALSE;
-- Paylaşım: bağlantı yalnızca is_public = TRUE iken çalışır
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_public  BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE trips DROP CONSTRAINT IF EXISTS chk_trips_pace;
ALTER TABLE trips ADD CONSTRAINT chk_trips_pace CHECK (pace IS NULL OR pace IN ('sakin', 'normal', 'yogun'));
ALTER TABLE trips DROP CONSTRAINT IF EXISTS chk_trips_day_window;
ALTER TABLE trips ADD CONSTRAINT chk_trips_day_window
  CHECK (day_start IS NULL OR day_end IS NULL OR day_end >= day_start + INTERVAL '3 hours');
ALTER TABLE trips DROP CONSTRAINT IF EXISTS chk_trips_start_point;
ALTER TABLE trips ADD CONSTRAINT chk_trips_start_point
  CHECK ((start_lat IS NULL) = (start_lng IS NULL));   -- ikisi birlikte var ya da yok

-- ---------- Durak: zaman aralığı ve önceki noktadan yolculuk ----------
ALTER TABLE day_plan_items ADD COLUMN IF NOT EXISTS end_time       TIME;
ALTER TABLE day_plan_items ADD COLUMN IF NOT EXISTS travel_minutes SMALLINT;
ALTER TABLE day_plan_items ADD COLUMN IF NOT EXISTS travel_km      NUMERIC(6, 2);
ALTER TABLE day_plan_items ADD COLUMN IF NOT EXISTS travel_mode    VARCHAR(15);

ALTER TABLE day_plan_items DROP CONSTRAINT IF EXISTS chk_items_time_order;
ALTER TABLE day_plan_items ADD CONSTRAINT chk_items_time_order
  CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time);
ALTER TABLE day_plan_items DROP CONSTRAINT IF EXISTS chk_items_travel;
ALTER TABLE day_plan_items ADD CONSTRAINT chk_items_travel
  CHECK ((travel_minutes IS NULL OR travel_minutes >= 0) AND (travel_km IS NULL OR travel_km >= 0)
         AND (travel_mode IS NULL OR travel_mode IN ('yuruyus', 'toplu-tasima')));

-- Bir POI aynı rotada iki kez yer alamaz (iş kuralı R4): aynı gün içinde DB seviyesinde,
-- günler arası kontrol servis katmanında yapılır (iki tabloya yayılan kural CHECK ile yazılamaz).
CREATE UNIQUE INDEX IF NOT EXISTS uq_items_day_poi ON day_plan_items (day_plan_id, poi_id);

-- Herkese açık paylaşım bağlantısı araması
CREATE INDEX IF NOT EXISTS idx_trips_public_share ON trips (share_code) WHERE is_public;
