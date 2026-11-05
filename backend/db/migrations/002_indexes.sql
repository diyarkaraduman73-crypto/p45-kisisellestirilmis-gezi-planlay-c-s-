-- Migration 002: İndeksler
-- PostgreSQL PRIMARY KEY ve UNIQUE kısıtları için indeksi otomatik oluşturur,
-- ancak YABANCI ANAHTAR sütunlarına otomatik indeks EKLEMEZ. JOIN ve ON DELETE CASCADE
-- işlemleri bu sütunlar üzerinden yapıldığı için indeksleri biz ekliyoruz.

-- POI kataloğu en sık "şehir + ilgi alanı" ile filtrelenir (GET /api/pois?city=&interests=)
-- Bileşik indeks hem (city_id) hem (city_id, interest_id) aramalarında kullanılır.
CREATE INDEX IF NOT EXISTS idx_pois_city_interest ON pois (city_id, interest_id);
-- Yalnızca ilgi alanına göre arama ve interests silinirken FK kontrolü için
CREATE INDEX IF NOT EXISTS idx_pois_interest ON pois (interest_id);
-- POI adıyla büyük/küçük harf duyarsız arama (WHERE lower(name) LIKE 'gal%')
CREATE INDEX IF NOT EXISTS idx_pois_name_lower ON pois (lower(name) text_pattern_ops);

-- "Bu ilgi alanını seçen kullanıcılar" sorgusu için. (user_id, interest_id) PK'sı
-- user_id ile başladığı için sadece interest_id ile aramada kullanılamaz.
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON user_interests (interest_id);

-- Bir kullanıcının rotaları, en yeniden eskiye (GET /api/users/:id/trips)
CREATE INDEX IF NOT EXISTS idx_trips_user_created ON trips (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_city ON trips (city_id);

-- day_plans (trip_id, day_number) UNIQUE kısıtı trip_id için indeks görevi görür.
-- day_plan_items (day_plan_id, visit_order) UNIQUE kısıtı day_plan_id için indeks görevi görür.
-- POI silinmek istendiğinde "bu POI bir planda kullanılıyor mu?" kontrolü için:
CREATE INDEX IF NOT EXISTS idx_day_plan_items_poi ON day_plan_items (poi_id);
