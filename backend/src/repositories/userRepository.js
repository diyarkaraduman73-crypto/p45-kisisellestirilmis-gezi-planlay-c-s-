// VERİ KATMANI: Kullanıcı CRUD'u (users + user_preferences + user_interests)
import { requireDb, withTransaction } from '../config/db.js';

// password_hash asla dışarı verilmez
const USER_COLUMNS = 'u.id, u.full_name, u.email, u.created_at';

// CREATE: kullanıcı + tercihleri + ilgi alanları tek transaction'da eklenir.
export async function create({ fullName, email, passwordHash, preferences = {}, interestSlugs = [] }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id`,
      [fullName, email, passwordHash]
    );
    const userId = rows[0].id;
    await upsertPreferences(client, userId, preferences);
    await replaceInterests(client, userId, interestSlugs);
    return findById(userId, client);
  });
}

// READ (tek kayıt): tercih ve ilgi alanlarıyla birlikte
export async function findById(id, db = requireDb()) {
  const { rows } = await db.query(
    `SELECT ${USER_COLUMNS},
            COALESCE(up.budget, 'orta')   AS budget,
            COALESCE(up.pace, 'normal')   AS pace,
            COALESCE(up.language, 'tr')   AS language,
            COALESCE(array_agg(i.slug ORDER BY i.slug) FILTER (WHERE i.slug IS NOT NULL), '{}') AS interests
     FROM users u
     LEFT JOIN user_preferences up ON up.user_id = u.id
     LEFT JOIN user_interests ui   ON ui.user_id = u.id
     LEFT JOIN interests i         ON i.id = ui.interest_id
     WHERE u.id = $1
     GROUP BY u.id, up.user_id`,
    [id]
  );
  return rows[0] || null;
}

// READ (liste, sayfalı)
export async function findAll({ limit = 20, offset = 0 } = {}) {
  const { rows } = await requireDb().query(
    `SELECT ${USER_COLUMNS} FROM users u ORDER BY u.id LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function existsByEmail(email) {
  const { rowCount } = await requireDb().query('SELECT 1 FROM users WHERE email = $1', [email]);
  return rowCount > 0;
}

// UPDATE: verilen alanlar güncellenir; tercih/ilgi verilmişse onlar da aynı transaction'da.
export async function update(id, { fullName, email, preferences, interestSlugs }) {
  return withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE users SET full_name = COALESCE($2, full_name), email = COALESCE($3, email)
       WHERE id = $1`,
      [id, fullName ?? null, email ?? null]
    );
    if (rowCount === 0) return null;
    if (preferences) await upsertPreferences(client, id, preferences);
    if (interestSlugs) await replaceInterests(client, id, interestSlugs);
    return findById(id, client);
  });
}

// DELETE: CASCADE sayesinde tercihler, ilgiler, rotalar ve gün planları da silinir.
export async function remove(id) {
  const { rowCount } = await requireDb().query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount > 0;
}

// --- yardımcılar (transaction içindeki client ile çalışır) ---

async function upsertPreferences(client, userId, { budget = 'orta', pace = 'normal', language = 'tr' }) {
  await client.query(
    `INSERT INTO user_preferences (user_id, budget, pace, language) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET budget = EXCLUDED.budget, pace = EXCLUDED.pace, language = EXCLUDED.language`,
    [userId, budget, pace, language]
  );
}

// N-N ilişki: önce mevcut bağlar silinir, sonra slug'lara karşılık gelen ilgiler eklenir.
async function replaceInterests(client, userId, slugs) {
  await client.query('DELETE FROM user_interests WHERE user_id = $1', [userId]);
  if (!slugs.length) return;
  await client.query(
    `INSERT INTO user_interests (user_id, interest_id)
     SELECT $1, id FROM interests WHERE slug = ANY($2::text[])`,
    [userId, slugs]
  );
}
