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

// READ: rota + günler + duraklar (POI adı/konumu ile) tek nesne olarak.
// PostgreSQL'deki iç içe json_agg yerine üç basit sorgu atılır ve nesne JS'te birleştirilir.
export async function findById(id, db = requireDb()) {
  const { rows } = await db.query(
    `SELECT t.id, t.user_id, t.title, t.start_date, t.day_count, t.share_code, t.is_public,
            t.generated, t.pace, t.day_start, t.day_end,
            t.start_lat, t.start_lng, t.created_at, t.updated_at, c.name AS city
     FROM trips t JOIN cities c ON c.id = t.city_id
     WHERE t.id = $1`,
    [id]
  );
  const trip = rows[0];
  if (!trip) return null;

  const { rows: days } = await db.query(
    'SELECT id, day_number, summary FROM day_plans WHERE trip_id = $1 ORDER BY day_number',
    [id]
  );
  const { rows: items } = await db.query(
    `SELECT it.day_plan_id, it.visit_order, it.start_time, it.end_time,
            it.travel_minutes, it.travel_km, it.travel_mode, i.slug AS interest,
            it.note, p.id AS poi_id, p.name, p.lat, p.lng, p.visit_minutes, p.is_active
     FROM day_plan_items it
     JOIN day_plans d  ON d.id = it.day_plan_id
     JOIN pois p       ON p.id = it.poi_id
     JOIN interests i  ON i.id = p.interest_id
     WHERE d.trip_id = $1
     ORDER BY it.day_plan_id, it.visit_order`,
    [id]
  );

  return {
    ...trip,
    is_public: !!trip.is_public,
    generated: !!trip.generated,
    days: days.map((d) => ({
      ...d,
      items: items
        .filter((it) => it.day_plan_id === d.id)
        .map(({ day_plan_id: _omit, ...it }) => ({ ...it, is_active: !!it.is_active })),
    })),
  };
}

// Paylaşım bağlantısı yalnızca rota herkese açıksa çalışır
export async function findPublicByShareCode(code) {
  const { rows } = await requireDb().query('SELECT id FROM trips WHERE share_code = $1 AND is_public = 1', [code]);
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
            COUNT(DISTINCT d.id) AS planned_days,
            COUNT(it.id)         AS stop_count
     FROM trips t
     JOIN cities c ON c.id = t.city_id
     LEFT JOIN day_plans d       ON d.trip_id = t.id
     LEFT JOIN day_plan_items it ON it.day_plan_id = d.id
     WHERE t.user_id = $1
     GROUP BY t.id, c.name
     ORDER BY t.created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({ ...r, is_public: !!r.is_public, generated: !!r.generated }));
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
      await deleteDays(client, id);
      await insertDays(client, id, days);
      await client.query('UPDATE trips SET day_count = max(day_count, $2) WHERE id = $1', [id, days.length]);
    }
    return findById(id, client);
  });
}

// Önce duraklar, sonra günler silinir (SQLite'ta CASCADE'e güvenilmez).
async function deleteDays(client, tripId) {
  await client.query(
    'DELETE FROM day_plan_items WHERE day_plan_id IN (SELECT id FROM day_plans WHERE trip_id = $1)',
    [tripId]
  );
  await client.query('DELETE FROM day_plans WHERE trip_id = $1', [tripId]);
}

// DELETE: rota, günleri ve durakları tek transaction'da silinir.
export async function remove(id) {
  return withTransaction(async (client) => {
    await deleteDays(client, id);
    const { rowCount } = await client.query('DELETE FROM trips WHERE id = $1', [id]);
    return rowCount > 0;
  });
}

// Bir kullanıcının tüm rotaları (kullanıcı silinirken kullanılır; client transaction'ı içindedir)
export async function removeAllForUser(client, userId) {
  await client.query(
    `DELETE FROM day_plan_items WHERE day_plan_id IN
       (SELECT d.id FROM day_plans d JOIN trips t ON t.id = d.trip_id WHERE t.user_id = $1)`,
    [userId]
  );
  await client.query('DELETE FROM day_plans WHERE trip_id IN (SELECT id FROM trips WHERE user_id = $1)', [userId]);
  await client.query('DELETE FROM trips WHERE user_id = $1', [userId]);
}
