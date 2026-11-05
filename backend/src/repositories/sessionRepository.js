// VERİ KATMANI: Oturumlar (JWT jti kayıtları)
import { requireDb } from '../config/db.js';

export async function create({ id, userId, expiresAt, userAgent }) {
  await requireDb().query(
    `INSERT INTO sessions (id, user_id, expires_at, user_agent) VALUES ($1, $2, $3, $4)`,
    [id, userId, expiresAt, userAgent ? String(userAgent).slice(0, 255) : null]
  );
}

// Geçerli oturum: iptal edilmemiş ve süresi dolmamış
export async function findActive(id) {
  const { rows } = await requireDb().query(
    `SELECT id, user_id, expires_at FROM sessions
     WHERE id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [id]
  );
  return rows[0] || null;
}

export async function revoke(id) {
  await requireDb().query('UPDATE sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL', [id]);
}

// Parola değişince / hesap kilitlenince: (isteğe bağlı olarak mevcut oturum hariç) tüm oturumları kapat
export async function revokeAllForUser(userId, exceptId = null) {
  const { rowCount } = await requireDb().query(
    `UPDATE sessions SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL AND ($2::uuid IS NULL OR id <> $2::uuid)`,
    [userId, exceptId]
  );
  return rowCount;
}

// Süresi 7 günden fazla önce dolmuş kayıtları temizler (tablo şişmesin)
export async function deleteExpired() {
  const { rowCount } = await requireDb().query(
    `DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '7 days'`
  );
  return rowCount;
}
