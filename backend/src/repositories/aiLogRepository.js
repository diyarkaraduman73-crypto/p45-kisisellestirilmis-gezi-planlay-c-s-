// VERİ KATMANI: yapay zekâ kullanım günlüğü (ai_logs)
import { requireDb } from '../config/db.js';

export async function insert(e) {
  await requireDb().query(
    `INSERT INTO ai_logs (user_id, trip_id, feature, model, prompt_version, prompt_hash, status,
                          latency_ms, input_tokens, output_tokens, issues, output_excerpt)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [e.userId ?? null, e.tripId ?? null, e.feature, e.model ?? null, e.promptVersion, e.promptHash ?? null, e.status,
     e.latencyMs ?? null, e.inputTokens ?? null, e.outputTokens ?? null, JSON.stringify(e.issues ?? []),
     e.output ? String(e.output).slice(0, 4000) : null]
  );
}

// Yönetici: son kayıtlar ve özet (durum başına sayı, ortalama süre)
export async function recent(limit = 50) {
  const db = requireDb();
  const { rows } = await db.query(
    `SELECT id, user_id, trip_id, feature, model, prompt_version, status, latency_ms, input_tokens, output_tokens,
            issues, output_excerpt, created_at
     FROM ai_logs ORDER BY created_at DESC LIMIT $1`, [limit]);
  const { rows: summary } = await db.query(
    `SELECT status, COUNT(*)::int AS adet, ROUND(AVG(latency_ms))::int AS ort_sure_ms
     FROM ai_logs GROUP BY status ORDER BY adet DESC`);
  return { summary, logs: rows };
}
