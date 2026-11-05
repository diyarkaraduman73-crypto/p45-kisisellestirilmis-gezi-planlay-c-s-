// Tabloları oluşturur ve seed verilerini yükler:  npm run db:init
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { pool } from '../src/config/db.js';
import { CITIES, INTERESTS, POIS } from '../src/data/seed.js';

if (!pool) {
  console.error('DATABASE_URL tanımlı değil. backend/.env dosyasına Neon bağlantı adresini ekleyin.');
  process.exit(1);
}

const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
await pool.query(schema);

for (const c of CITIES) {
  await pool.query('INSERT INTO cities (name, country) VALUES ($1,$2) ON CONFLICT (name, country) DO NOTHING', [c.name, c.country]);
}
for (const i of INTERESTS) {
  await pool.query('INSERT INTO interests (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name', [i.slug, i.name]);
}

const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM pois');
if (rows[0].n === 0) {
  for (const p of POIS) {
    await pool.query(
      `INSERT INTO pois (city_id, interest_id, name, description, lat, lng, visit_minutes, price_level)
       VALUES ((SELECT id FROM cities WHERE name = $1), (SELECT id FROM interests WHERE slug = $2),
               $3, $4, $5, $6, $7, $8)`,
      [p.city, p.interest, p.name, p.description, p.lat, p.lng, p.visit_minutes, p.price_level]
    );
  }
  console.log(`${POIS.length} POI eklendi.`);
} else {
  console.log(`pois tablosunda zaten ${rows[0].n} kayıt var, seed atlandı.`);
}

await pool.end();
console.log('Veritabanı hazır.');
