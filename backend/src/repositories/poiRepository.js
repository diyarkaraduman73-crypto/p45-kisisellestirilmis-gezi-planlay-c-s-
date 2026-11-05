// VERİ KATMANI: POI kataloğuna erişim.
import { pool, hasDb } from '../config/db.js';
import { POIS } from '../data/seed.js';

const SELECT = `
  SELECT p.id, p.name, p.description, p.lat, p.lng, p.visit_minutes, p.price_level,
         c.name AS city, i.slug AS interest
  FROM pois p
  JOIN cities c    ON c.id = p.city_id
  JOIN interests i ON i.id = p.interest_id`;

const sameCity = (a, b) => a.toLocaleLowerCase('tr') === b.toLocaleLowerCase('tr');

export async function findMany({ city, interests = [] } = {}) {
  if (hasDb()) {
    const conds = [];
    const params = [];
    if (city) { params.push(city); conds.push(`c.name = $${params.length}`); }
    if (interests.length) { params.push(interests); conds.push(`i.slug = ANY($${params.length})`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await pool.query(`${SELECT} ${where} ORDER BY p.id`, params);
    return rows;
  }
  return POIS.filter(
    (p) => (!city || sameCity(p.city, city)) && (!interests.length || interests.includes(p.interest))
  );
}

export async function findById(id) {
  if (hasDb()) {
    const { rows } = await pool.query(`${SELECT} WHERE p.id = $1`, [id]);
    return rows[0] || null;
  }
  return POIS.find((p) => p.id === id) || null;
}
