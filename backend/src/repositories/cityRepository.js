// VERİ KATMANI: Şehirler
import { pool, hasDb } from '../config/db.js';
import { CITIES } from '../data/seed.js';

export async function findAll() {
  if (hasDb()) {
    const { rows } = await pool.query('SELECT id, name, country FROM cities ORDER BY name');
    return rows;
  }
  return CITIES;
}

export async function findByName(name) {
  if (hasDb()) {
    const { rows } = await pool.query('SELECT id, name, country FROM cities WHERE lower(name) = lower($1)', [name]);
    return rows[0] || null;
  }
  return CITIES.find((c) => c.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr')) || null;
}
