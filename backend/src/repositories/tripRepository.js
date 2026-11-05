// VERİ KATMANI: Rota (trip) + gün planı + durak CRUD'u
import { requireDb, withTransaction } from '../config/db.js';

// CREATE: rota, günleri ve durakları TEK TRANSACTION'da eklenir.
// Herhangi bir durakta hata olursa (ör. olmayan POI) yarım rota kalmaz, hepsi geri alınır.
// days: [{ dayNumber, summary, items: [{ poiId, startTime, endTime, travelMinutes, travelKm, travelMode, note }] }]
// gen (isteğe bağlı, üretilen rotalar için): { pace, dayStart, dayEnd, start: {lat,lng} }
export async function create({ userId, cityId, title, startDate, dayCount, shareCode, days = [], gen = null }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO trips (user_id, city_id, title, start_date, day_count, share_code,
                         generated, pace, day_start, day_end, start_lat, start_lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [userId, cityId, title, startDate ?? null, dayCount, shareCode ?? null,
       !!gen, gen?.pace ?? null, gen?.dayStart ?? null, gen?.dayEnd ?? null,
       gen?.start?.lat ?? null, gen?.start?.lng ?? null]
    );
    const tripId = rows[0].id;
    await insertDays(client, tripId, days);
    return findById(tripId, client);
  });
}

async function insertDays(client, tripId, days) {
  for (const day of days) {
    const { rows } = await client.query(
      `INSERT INTO day_plans (trip_id, day_number, summary) VALUES ($1, $2, $3) RETURNING id`,
      [tripId, day.dayNumber, day.summary ?? null]
    );
    const dayPlanId = rows[0].id;
    let order = 1;
    for (const item of day.items || []) {
      await client.query(
        `INSERT INTO day_plan_items (day_plan_id, poi_id, visit_order, start_time, end_time,
                                     travel_minutes, travel_km, travel_mode, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [dayPlanId, item.poiId, order++, item.startTime ?? null, item.endTime ?? null,
         item.travelMinutes ?? null, item.travelKm ?? null, item.travelMode ?? null, item.note ?? null]
      );
    }
  }
}

// READ: rota + günler + duraklar (POI adı/konumu ile) tek nesne olarak
export async function findById(id, db = requireDb()) {
  const { rows } = await db.query(
    `SELECT t.id, t.user_id, t.title, t.start_date, t.day_count, t.share_code, t.is_public,
            t.generated, t.pace, to_char(t.day_start, 'HH24:MI') AS day_start, to_char(t.day_end, 'HH24:MI') AS day_end,
            t.start_lat, t.start_lng, t.created_at, t.updated_at, c.name AS city,
            COALESCE((
              SELECT json_agg(json_build_object(
                       'id', d.id, 'day_number', d.day_number, 'summary', d.summary,
                       'items', COALESCE((
                         SELECT json_agg(json_build_object(
                                  'visit_order', it.visit_order,
                                  'start_time', to_char(it.start_time, 'HH24:MI'),
                                  'end_time', to_char(it.end_time, 'HH24:MI'),
                                  'travel_minutes', it.travel_minutes, 'travel_km', it.travel_km,
                                  'travel_mode', it.travel_mode, 'interest', i.slug,
                                  'note', it.note, 'poi_id', p.id, 'name', p.name,
                                  'lat', p.lat, 'lng', p.lng, 'visit_minutes', p.visit_minutes,
                                  'is_active', p.is_active)
                                ORDER BY it.visit_order)
                         FROM day_plan_items it JOIN pois p ON p.id = it.poi_id
                         JOIN interests i ON i.id = p.interest_id
                         WHERE it.day_plan_id = d.id), '[]'::json))
                     ORDER BY d.day_number)
              FROM day_plans d WHERE d.trip_id = t.id), '[]'::json) AS days
     FROM trips t JOIN cities c ON c.id = t.city_id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

// Paylaşım bağlantısı yalnızca rota herkese açıksa çalışır
export async function findPublicByShareCode(code) {
  const { rows } = await requireDb().query('SELECT id FROM trips WHERE share_code = $1 AND is_public', [code]);
  return rows[0] ? findById(rows[0].id) : null;
}

// Paylaşımı aç/kapat; newCode verilirse eski bağlantı geçersiz olur
export async function setSharing(id, { isPublic, newCode }) {
  await requireDb().query(
    `UPDATE trips SET is_public = $2, share_code = COALESCE($3, share_code) WHERE id = $1`,
    [id, isPublic, newCode ?? null]
  );
  return findById(id);
}

// READ (liste): kullanıcının rotaları, gün ve durak sayılarıyla
export async function findByUser(userId) {
  const { rows } = await requireDb().query(
    `SELECT t.id, t.title, t.start_date, t.day_count, t.share_code, t.is_public, t.generated, t.pace,
            t.created_at, c.name AS city,
            COUNT(DISTINCT d.id)::int AS planned_days,
            COUNT(it.id)::int         AS stop_count
     FROM trips t
     JOIN cities c ON c.id = t.city_id
     LEFT JOIN day_plans d       ON d.trip_id = t.id
     LEFT JOIN day_plan_items it ON it.day_plan_id = d.id
     WHERE t.user_id = $1
     GROUP BY t.id, c.name
     ORDER BY t.created_at DESC`,
    [userId]
  );
  return rows;
}

// UPDATE: başlık/tarih; days verilirse gün planı tamamen yenilenir (transaction).
export async function update(id, { title, startDate, days }) {
  return withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE trips SET title = COALESCE($2, title), start_date = COALESCE($3, start_date)
       WHERE id = $1`,
      [id, title ?? null, startDate ?? null]
    );
    if (rowCount === 0) return null;
    if (days) {
      await client.query('DELETE FROM day_plans WHERE trip_id = $1', [id]); // durakları CASCADE siler
      await insertDays(client, id, days);
      await client.query('UPDATE trips SET day_count = GREATEST(day_count, $2) WHERE id = $1', [id, days.length]);
    }
    return findById(id, client);
  });
}

// DELETE: günler ve duraklar CASCADE ile silinir.
export async function remove(id) {
  const { rowCount } = await requireDb().query('DELETE FROM trips WHERE id = $1', [id]);
  return rowCount > 0;
}
