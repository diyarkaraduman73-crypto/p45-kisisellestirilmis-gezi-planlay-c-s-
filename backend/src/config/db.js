// Veri katmanı yapılandırması: PostgreSQL bağlantı havuzu ve transaction yardımcısı.
import pg from 'pg';

const { DATABASE_URL } = process.env;

// Hafta 8 düzeltmesi: PostgreSQL DATE (OID 1082) varsayılan olarak yerel gece yarısına ayarlı bir
// JS Date nesnesine çevriliyor, JSON'a yazılırken de UTC'ye kayıyordu. Türkiye'de (UTC+3) çalışan
// sunucuda 2026-11-26 tarihli rota "2026-11-25T21:00:00Z" olarak gidiyor, arayüzde bir gün önce
// görünüyordu. Takvim tarihinin saati/saat dilimi yoktur; olduğu gibi "YYYY-AA-GG" metni döndürülür.
pg.types.setTypeParser(1082, (value) => value);

export const pool = DATABASE_URL
  ? new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
      max: 5,
    })
  : null;

export const hasDb = () => pool !== null;

// Veritabanı gerektiren işlemlerde kullanılır; DB yoksa 503 döndürülür.
export function requireDb() {
  if (!pool) {
    const err = new Error('Bu işlem için veritabanı bağlantısı gerekli (DATABASE_URL).');
    err.status = 503;
    throw err;
  }
  return pool;
}

// İŞLEM (TRANSACTION): fn içindeki tüm sorgular ya birlikte kalıcı olur (COMMIT)
// ya da biri hata verirse hepsi geri alınır (ROLLBACK).
export async function withTransaction(fn) {
  const client = await requireDb().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
