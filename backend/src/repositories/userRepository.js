// VERİ KATMANI: Kullanıcı CRUD'u (users + user_preferences + user_interests)
import { requireDb, withTransaction } from '../config/db.js';

// password_hash asla dışarı verilmez
const USER_COLUMNS = 'u.id, u.full_name, u.email, u.role, u.created_at, u.last_login_at';

// CREATE: kullanıcı + tercihleri + ilgi alanları tek transaction'da eklenir.
export async function create({ fullName, email, passwordHash, role = 'gezgin', preferences = {}, interestSlugs = [] }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [fullName, email, passwordHash, role]
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

// --- Kimlik doğrulama için (password_hash yalnızca burada okunur, servis dışına çıkmaz) ---

export async function findAuthByEmail(email) {
  const { rows } = await requireDb().query(
    `SELECT id, password_hash, role, failed_login_count, locked_until
     FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

export async function findPasswordHash(id) {
  const { rows } = await requireDb().query('SELECT password_hash FROM users WHERE id = $1', [id]);
  return rows[0]?.password_hash ?? null;
}

// Başarısız giriş: sayaç artar; eşiğe ulaşınca hesap kilitlenir ve sayaç sıfırlanır.
// Tek UPDATE ifadesiyle yapılır, eş zamanlı isteklerde sayaç kaybolmaz.
export async function recordFailedLogin(id, maxAttempts, lockMinutes) {
  const { rows } = await requireDb().query(
    `UPDATE users SET
       failed_login_count = CASE WHEN failed_login_count + 1 >= $2 THEN 0 ELSE failed_login_count + 1 END,
       locked_until       = CASE WHEN failed_login_count + 1 >= $2
                                 THEN NOW() + make_interval(mins => $3) ELSE locked_until END
     WHERE id = $1
     RETURNING failed_login_count, locked_until`,
    [id, maxAttempts, lockMinutes]
  );
  return rows[0];
}

export async function recordSuccessfulLogin(id) {
  await requireDb().query(
    `UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1`,
    [id]
  );
}

export async function updatePassword(id, passwordHash) {
  await requireDb().query('UPDATE users SET password_hash = $2 WHERE id = $1', [id, passwordHash]);
}

export async function updateRole(id, role) {
  const { rowCount } = await requireDb().query('UPDATE users SET role = $2 WHERE id = $1', [id, role]);
  return rowCount ? findById(id) : null;
}

export async function countByRole(role) {
  const { rows } = await requireDb().query('SELECT COUNT(*)::int AS n FROM users WHERE role = $1', [role]);
  return rows[0].n;
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
