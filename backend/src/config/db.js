// Veri katmanı yapılandırması: PostgreSQL bağlantı havuzu ve transaction yardımcısı.
import pg from 'pg';

const { DATABASE_URL } = process.env;

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
