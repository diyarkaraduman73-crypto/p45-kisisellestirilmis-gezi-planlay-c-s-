// VERİ KATMANI: POI kataloğu.
// Okuma işlemleri DB yokken seed verisiyle de çalışır; yazma işlemleri DB gerektirir.
import { pool, hasDb, requireDb, withTransaction } from '../config/db.js';
import { POIS } from '../data/seed.js';
import { boundingBox, distanceKm, sqlDistanceKm } from '../utils/geo.js';

const COLUMNS = `
  p.id, p.name, p.description, p.district, p.address, p.lat, p.lng,
  p.visit_minutes, p.price_level, p.is_active, p.updated_at,
  c.name AS city, i.slug AS interest, i.name AS interest_name,
  COALESCE((SELECT array_agg(t.slug ORDER BY t.slug)
            FROM poi_tags pt JOIN tags t ON t.id = pt.tag_id
            WHERE pt.poi_id = p.id), '{}') AS tags`;

const FROM = `
  FROM pois p
  JOIN cities c    ON c.id = p.city_id
  JOIN interests i ON i.id = p.interest_id`;

const lower = (s) => s.toLocaleLowerCase('tr');

// READ (liste). Filtreler:
//   city, interests[], tags[] (hepsini taşıyanlar), search (ad öneki), priceMax,
//   near {lat, lng, radiusKm} → mesafeye göre sıralı, distance_km alanıyla
//   includeInactive (yalnızca yönetici için)
export async function findMany(f = {}) {
  const { city, interests = [], tags = [], search, priceMax, near, includeInactive = false, limit = 200 } = f;

  if (!hasDb()) return findManyInMemory(f);

  const conds = [];
  const params = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };

  if (!includeInactive) conds.push('p.is_active');
  if (city) conds.push(`lower(c.name) = lower(${add(city)})`);
  if (interests.length) conds.push(`i.slug = ANY(${add(interests)}::text[])`);
  if (tags.length) {
    // İlişkisel bölme: istenen etiketlerin HEPSİNE sahip POI'ler
    conds.push(`p.id IN (SELECT pt.poi_id FROM poi_tags pt JOIN tags t ON t.id = pt.tag_id
                         WHERE t.slug = ANY(${add(tags)}::text[])
                         GROUP BY pt.poi_id HAVING COUNT(DISTINCT t.slug) = ${add(tags.length)})`);
  }
  if (search) conds.push(`lower(p.name) LIKE ${add(`${search.toLowerCase()}%`)}`);
  if (priceMax !== undefined) conds.push(`p.price_level <= ${add(priceMax)}`);

  let distance = '';
  let order = 'p.id';
  if (near) {
    const b = boundingBox(near.lat, near.lng, near.radiusKm);
    conds.push(`p.lat BETWEEN ${add(b.minLat)} AND ${add(b.maxLat)}`);
    conds.push(`p.lng BETWEEN ${add(b.minLng)} AND ${add(b.maxLng)}`);
    const d = sqlDistanceKm(add(near.lat), add(near.lng));
    conds.push(`${d} <= ${add(near.radiusKm)}`);
    distance = `, round(${d}::numeric, 2)::float AS distance_km`;
    order = 'distance_km';
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT ${COLUMNS}${distance} ${FROM} ${where} ORDER BY ${order} LIMIT ${add(limit)}`,
    params
  );
  return rows;
}

function findManyInMemory({ city, interests = [], tags = [], search, priceMax, near }) {
  const q = search && lower(search);
  let list = POIS.map((p) => ({ ...p, is_active: true }))
    .filter((p) =>
      (!city || lower(p.city) === lower(city)) &&
      (!interests.length || interests.includes(p.interest)) &&
      tags.every((t) => p.tags.includes(t)) &&
      (!q || lower(p.name).startsWith(q)) &&
      (priceMax === undefined || p.price_level <= priceMax));
  if (near) {
    list = list
      .map((p) => ({ ...p, distance_km: Math.round(distanceKm(near.lat, near.lng, p.lat, p.lng) * 100) / 100 }))
      .filter((p) => p.distance_km <= near.radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);
  }
  return list;
}

// READ (tek kayıt)
export async function findById(id, { includeInactive = false } = {}) {
  if (!hasDb()) {
    const p = POIS.find((x) => x.id === id);
    return p ? { ...p, is_active: true } : null;
  }
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} ${FROM} WHERE p.id = $1 ${includeInactive ? '' : 'AND p.is_active'}`,
    [id]
  );
  return rows[0] || null;
}

// İş kuralı kontrolü: aynı şehirde aynı ad (kendisi hariç)
export async function existsByCityAndName(cityId, name, exceptId = null) {
  const { rowCount } = await requireDb().query(
    `SELECT 1 FROM pois WHERE city_id = $1 AND lower(name) = lower($2) AND ($3::int IS NULL OR id <> $3::int)`,
    [cityId, name, exceptId]
  );
  return rowCount > 0;
}

// Gezi planına eklenebilir (aktif) POI sayısı
export async function countActive(ids) {
  const { rows } = await requireDb().query(
    'SELECT COUNT(*)::int AS n FROM pois WHERE id = ANY($1::int[]) AND is_active',
    [ids]
  );
  return rows[0].n;
}

export async function usageCount(id) {
  const { rows } = await requireDb().query('SELECT COUNT(*)::int AS n FROM day_plan_items WHERE poi_id = $1', [id]);
  return rows[0].n;
}

async function setTags(client, poiId, tagSlugs) {
  await client.query('DELETE FROM poi_tags WHERE poi_id = $1', [poiId]);
  if (!tagSlugs.length) return;
  await client.query(
    `INSERT INTO poi_tags (poi_id, tag_id) SELECT $1, id FROM tags WHERE slug = ANY($2::text[])`,
    [poiId, tagSlugs]
  );
}

// CREATE: POI + etiketleri tek transaction'da
export async function create(d) {
  const id = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO pois (city_id, interest_id, name, description, district, address, lat, lng,
                         visit_minutes, price_level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [d.cityId, d.interestId, d.name, d.description ?? null, d.district ?? null, d.address ?? null,
       d.lat, d.lng, d.visitMinutes, d.priceLevel, d.createdBy ?? null]
    );
    await setTags(client, rows[0].id, d.tags ?? []);
    return rows[0].id;
  });
  return findById(id, { includeInactive: true });
}

// UPDATE: verilen alanlar değişir; tags verilirse etiket listesi tamamen yenilenir
export async function update(id, d) {
  const ok = await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE pois SET
         name          = COALESCE($2, name),
         description   = COALESCE($3, description),
         district      = COALESCE($4, district),
         address       = COALESCE($5, address),
         lat           = COALESCE($6, lat),
         lng           = COALESCE($7, lng),
         visit_minutes = COALESCE($8, visit_minutes),
         price_level   = COALESCE($9, price_level),
         interest_id   = COALESCE($10, interest_id),
         is_active     = COALESCE($11, is_active)
       WHERE id = $1`,
      [id, d.name ?? null, d.description ?? null, d.district ?? null, d.address ?? null, d.lat ?? null,
       d.lng ?? null, d.visitMinutes ?? null, d.priceLevel ?? null, d.interestId ?? null, d.isActive ?? null]
    );
    if (!rowCount) return false;
    if (d.tags) await setTags(client, id, d.tags);
    return true;
  });
  return ok ? findById(id, { includeInactive: true }) : null;
}

// DELETE (kalıcı). Planlarda kullanılan POI için servis bunun yerine pasifleştirir.
export async function remove(id) {
  const { rowCount } = await requireDb().query('DELETE FROM pois WHERE id = $1', [id]);
  return rowCount > 0;
}
