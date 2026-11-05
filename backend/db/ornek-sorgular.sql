-- =====================================================================
-- Örnek sorgular (Hafta 4 demo) — seed verisi yüklü veritabanında çalıştırın:
--   psql "$DATABASE_URL" -f db/ornek-sorgular.sql
-- =====================================================================

-- 1) DML / READ: Bir kullanıcının ilgi alanları (N-N ilişki, ara tablo üzerinden JOIN)
SELECT u.full_name, string_agg(i.name, ', ' ORDER BY i.name) AS ilgi_alanlari
FROM users u
JOIN user_interests ui ON ui.user_id = u.id
JOIN interests i       ON i.id = ui.interest_id
WHERE u.id = 1
GROUP BY u.full_name;

-- 2) Kullanıcının ilgi alanlarına uyan POI'ler (kişiselleştirme temeli)
SELECT p.name, i.name AS ilgi, p.visit_minutes
FROM pois p
JOIN interests i ON i.id = p.interest_id
WHERE p.interest_id IN (SELECT interest_id FROM user_interests WHERE user_id = 1)
ORDER BY i.name, p.name;

-- 3) Bir rotanın gün gün planı (1-N: rota → gün → durak)
SELECT t.title, d.day_number AS gun, it.visit_order AS sira, it.start_time AS saat, p.name AS durak
FROM trips t
JOIN day_plans d       ON d.trip_id = t.id
JOIN day_plan_items it ON it.day_plan_id = d.id
JOIN pois p            ON p.id = it.poi_id
WHERE t.id = 1
ORDER BY d.day_number, it.visit_order;

-- 4) En çok plana eklenen POI'ler (öneri modülü için ham veri)
SELECT p.name, COUNT(*) AS plan_sayisi
FROM day_plan_items it
JOIN pois p ON p.id = it.poi_id
GROUP BY p.id, p.name
ORDER BY plan_sayisi DESC, p.name
LIMIT 5;

-- 5) Her kullanıcının rota ve durak sayısı (LEFT JOIN: rotası olmayanlar da listelenir)
SELECT u.full_name, COUNT(DISTINCT t.id) AS rota, COUNT(it.id) AS durak
FROM users u
LEFT JOIN trips t           ON t.user_id = u.id
LEFT JOIN day_plans d       ON d.trip_id = t.id
LEFT JOIN day_plan_items it ON it.day_plan_id = d.id
GROUP BY u.id, u.full_name
ORDER BY u.id;

-- 6) İndeks kullanımı: filtreler tam tablo taraması (Seq Scan) yerine Index Scan ile çalışır
--    (küçük tabloda planlayıcı yine de Seq Scan seçebilir; enable_seqscan=off ile zorlanır)
SET enable_seqscan = off;
EXPLAIN SELECT id, name FROM pois WHERE city_id = 1 AND interest_id = 1;
EXPLAIN SELECT id, name FROM pois WHERE lower(name) LIKE 'gal%';
RESET enable_seqscan;

-- 7) TRANSACTION örneği: rota + gün + durak birlikte; hata olursa hiçbiri kalmaz
BEGIN;
  INSERT INTO trips (user_id, city_id, title, day_count) VALUES (1, 1, 'Transaction demo', 1);
  INSERT INTO day_plans (trip_id, day_number) VALUES (currval('trips_id_seq'), 1);
  INSERT INTO day_plan_items (day_plan_id, poi_id, visit_order)
       VALUES (currval('day_plans_id_seq'), 1, 1);
ROLLBACK;  -- demo olduğu için geri alıyoruz; gerçek kullanımda COMMIT
SELECT COUNT(*) AS demo_rotasi_kaldi_mi FROM trips WHERE title = 'Transaction demo';  -- 0
