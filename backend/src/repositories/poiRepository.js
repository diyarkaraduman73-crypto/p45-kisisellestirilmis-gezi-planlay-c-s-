// VERİ KATMANI: POI kataloğu CRUD'u.
// Okuma işlemleri DB yokken seed verisiyle de çalışır; yazma işlemleri DB gerektirir.
import { pool, hasDb, requireDb } from '../config/db.js';
import { POIS } from '../data/seed.js';

const SELECT = `
  SELECT p.id, p.name, p.description, p.lat, p.lng, p.visit_minutes, p.price_level,
         c.name AS city, i.slug AS interest
  FROM pois p
  JOIN cities c    ON c.id = p.city_id
  JOIN interests i ON i.id = p.interest_id`;

const sameCity = (a, b) => a.toLocaleLowerCase('tr') === b.toLocaleLowerCase('tr');

// READ (liste, filtreli)
export async function findMany({ city, interests = [], search } = {}) {
  if (hasDb()) {
    const conds = [];
    const params = [];
    if (city) { params.push(city); conds.push(`lower(c.name) = lower($${params.length})`); }
    if (interests.length) { params.push(interests); conds.push(`i.slug = ANY($${params.length}::text[])`); }
    // idx_pois_name_lower indeksini kullanan önek araması
    if (search) { params.push(`${search.toLowerCase()}%`); conds.push(`lower(p.name) LIKE $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await pool.query(`${SELECT} ${where} ORDER BY p.id`, params);
    return rows;
  }
  const q = search?.toLocaleLowerCase('tr');
  return POIS.filter(
    (p) => (!city || sameCity(p.city, city)) &&
           (!interests.length || interests.includes(p.interest)) &&
           (!q || p.name.toLocaleLowerCase('tr').startsWith(q))
  );
}

// READ (tek kayıt)
export async function findById(id) {
  if (hasDb()) {
    const { rows } = await pool.query(`${SELECT} WHERE p.id = $1`, [id]);
    return rows[0] || null;
  }
  return POIS.find((p) => p.id === id) || null;
}

export async function countExisting(ids) {
  const { rows } = await requireDb().query('SELECT COUNT(*)::int AS n FROM pois WHERE id = ANY($1::int[])', [ids]);
  return rows[0].n;
}

// CREATE: şehir ve ilgi alanı ad/slug ile verilir, FK id'leri alt sorguyla bulunur.
export async function create({ city, interest, name, description, lat, lng, visitMinutes, priceLevel }) {
  const { rows } = await requireDb().query(
    `INSERT INTO pois (city_id, interest_id, name, description, lat, lng, visit_minutes, price_level)
     VALUES ((SELECT id FROM cities WHERE lower(name) = lower($1)),
             (SELECT id FROM interests WHERE slug = $2), $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [city, interest, name, description ?? null, lat, lng, visitMinutes ?? 60, priceLevel ?? 0]
  );
  return findById(rows[0].id);
}

// UPDATE: yalnızca gönderilen alanlar değişir
export async function update(id, f) {
  const { rowCount } = await requireDb().query(
    `UPDATE pois SET
       name          = COALESCE($2, name),
       description   = COALESCE($3, description),
       visit_minutes = COALESCE($4, visit_minutes),
       price_level   = COALESCE($5, price_level),
       interest_id   = COALESCE((SELECT id FROM interests WHERE slug = $6), interest_id)
     WHERE id = $1`,
    [id, f.name ?? null, f.description ?? null, f.visitMinutes ?? null, f.priceLevel ?? null, f.interest ?? null]
  );
  return rowCount ? findById(id) : null;
}

// DELETE: POI bir gün planında kullanılıyorsa FK kısıtı silmeyi engeller (23503).
export async function remove(id) {
  const { rowCount } = await requireDb().query('DELETE FROM pois WHERE id = $1', [id]);
  return rowCount > 0;
}
