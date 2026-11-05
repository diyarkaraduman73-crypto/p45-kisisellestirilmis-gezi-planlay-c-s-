// VERİ KATMANI: Şehirler (merkez koordinatı ve hizmet yarıçapıyla)
import { pool, hasDb } from '../config/db.js';
import { CITIES } from '../data/seed.js';

const COLS = 'id, name, country, center_lat, center_lng, radius_km';

export async function findAll() {
  if (hasDb()) {
    const { rows } = await pool.query(`SELECT ${COLS} FROM cities ORDER BY name`);
    return rows;
  }
  return CITIES;
}

export async function findByName(name) {
  if (hasDb()) {
    const { rows } = await pool.query(`SELECT ${COLS} FROM cities WHERE lower(name) = lower($1)`, [name]);
    return rows[0] || null;
  }
  return CITIES.find((c) => c.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr')) || null;
}

export async function findById(id) {
  if (hasDb()) {
    const { rows } = await pool.query(`SELECT ${COLS} FROM cities WHERE id = $1`, [id]);
    return rows[0] || null;
  }
  return CITIES.find((c) => c.id === id) || null;
}
