// VERİ KATMANI: ilgi alanları tablosuna erişim. SQL yalnızca bu katmanda yazılır.
import { pool, hasDb } from '../config/db.js';
import { INTERESTS } from '../data/seed.js';

export async function findAll() {
  if (hasDb()) {
    const { rows } = await pool.query('SELECT id, slug, name FROM interests ORDER BY id');
    return rows;
  }
  return INTERESTS.map((i, idx) => ({ id: idx + 1, ...i }));
}
