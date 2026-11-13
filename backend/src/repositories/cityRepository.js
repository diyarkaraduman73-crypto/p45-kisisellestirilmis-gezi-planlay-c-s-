// VERİ KATMANI: Şehirler (merkez koordinatı ve hizmet yarıçapıyla)
import { pool, hasDb } from '../config/db.js';
import { CITIES } from '../data/seed.js';

const COLS = 'id, name, country, center_lat, center_lng, radius_km';
const trLower = (s) => String(s).toLocaleLowerCase('tr');

export async function findAll() {
  if (hasDb()) {
    const { rows } = await pool.query(`SELECT ${COLS} FROM cities ORDER BY name`);
    return rows;
  }
  return CITIES;
}

// SQLite'ın lower() fonksiyonu yalnızca ASCII harfleri küçültür ("İstanbul" → "İstanbul").
// Şehir sayısı az olduğundan karşılaştırma Türkçe kurallarıyla JS'te yapılır.
export async function findByName(name) {
  const list = await findAll();
  return list.find((c) => trLower(c.name) === trLower(name)) || null;
}

export async function findById(id) {
  if (hasDb()) {
    const { rows } = await pool.query(`SELECT ${COLS} FROM cities WHERE id = $1`, [id]);
    return rows[0] || null;
  }
  return CITIES.find((c) => c.id === id) || null;
}
