// VERİ KATMANI: Etiketler
import { pool, hasDb, requireDb, withTransaction } from '../config/db.js';
import { TAGS, POIS } from '../data/seed.js';

// Her etiketin kaç aktif POI'de kullanıldığıyla birlikte
export async function findAll() {
  if (!hasDb()) {
    return TAGS.map((t, i) => ({ id: i + 1, ...t, poi_count: POIS.filter((p) => p.tags.includes(t.slug)).length }));
  }
  const { rows } = await pool.query(
    `SELECT t.id, t.slug, t.name, COUNT(p.id) AS poi_count
     FROM tags t
     LEFT JOIN poi_tags pt ON pt.tag_id = t.id
     LEFT JOIN pois p      ON p.id = pt.poi_id AND p.is_active = 1
     GROUP BY t.id ORDER BY t.name`
  );
  return rows;
}

export async function findSlugs(slugs) {
  if (!slugs.length) return [];
  const marks = slugs.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await requireDb().query(`SELECT slug FROM tags WHERE slug IN (${marks})`, slugs);
  return rows.map((r) => r.slug);
}

export async function create(slug, name) {
  const { rows } = await requireDb().query(
    'INSERT INTO tags (slug, name) VALUES ($1, $2) RETURNING id, slug, name',
    [slug, name]
  );
  return { ...rows[0], poi_count: 0 };
}

// Etiket silinince poi_tags satırları da aynı transaction'da silinir; POI'ler etkilenmez
export async function removeBySlug(slug) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM poi_tags WHERE tag_id IN (SELECT id FROM tags WHERE slug = $1)', [slug]);
    const { rowCount } = await client.query('DELETE FROM tags WHERE slug = $1', [slug]);
    return rowCount > 0;
  });
}
