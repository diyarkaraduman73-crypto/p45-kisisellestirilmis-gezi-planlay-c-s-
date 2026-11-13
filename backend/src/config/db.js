// Veri katmanı yapılandırması: Turso (libSQL / SQLite) bağlantısı ve transaction yardımcısı.
//
// Repository'ler önceki PostgreSQL sürümündeki gibi  db.query(sql, params) → { rows, rowCount }
// arayüzünü kullanmaya devam eder. Bu dosya aradaki farkları kapatır:
//   - $1, $2 ... parametreleri SQLite'ın ?1, ?2 ... biçimine çevrilir
//   - Date → ISO metin, boolean → 1/0 olarak gönderilir
//   - SQLite kısıt hataları PostgreSQL hata kodlarına (23505 vb.) çevrilir; errorHandler değişmez
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = url ? createClient({ url, authToken }) : null;

// Şu anki zaman, JS'nin toISOString() biçimiyle aynı: 2026-11-13T10:00:00.000Z
// (metin olarak karşılaştırıldığında doğru sıralanır)
export const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const toArg = (v) => {
  if (v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
};

const convertSql = (sql) => sql.replace(/\$(\d+)/g, '?$1');

// SQLite kısıt mesajı → PostgreSQL hata kodu
function mapError(err) {
  const msg = String(err?.message || '');
  if (/UNIQUE constraint failed|PRIMARY KEY/i.test(msg)) err.code = '23505';
  else if (/FOREIGN KEY constraint failed/i.test(msg)) err.code = '23503';
  else if (/CHECK constraint failed/i.test(msg)) err.code = '23514';
  else if (/NOT NULL constraint failed/i.test(msg)) err.code = '23502';
  return err;
}

function wrap(executor) {
  return {
    async query(sql, params = []) {
      try {
        const rs = await executor.execute({ sql: convertSql(sql), args: params.map(toArg) });
        const rows = rs.rows.map((r) => {
          const o = {};
          rs.columns.forEach((c, i) => { o[c] = r[i]; });
          return o;
        });
        return { rows, rowCount: rs.columns.length ? rows.length : rs.rowsAffected };
      } catch (err) {
        throw mapError(err);
      }
    },
  };
}

export const pool = client
  ? { ...wrap(client), end: async () => client.close(), raw: client }
  : null;

export const hasDb = () => pool !== null;

// Veritabanı gerektiren işlemlerde kullanılır; DB yoksa 503 döndürülür.
export function requireDb() {
  if (!pool) {
    const err = new Error('Bu işlem için veritabanı bağlantısı gerekli (TURSO_DATABASE_URL).');
    err.status = 503;
    throw err;
  }
  return pool;
}

// NOT: SQLite/Turso'da yabancı anahtar denetimi varsayılan olarak KAPALIDIR ve bağlantı başına
// açılır; Turso'ya HTTP üzerinden giden her istek ayrı bir bağlantı olabilir. Bu yüzden
// ON DELETE CASCADE'e güvenilmez: bağlı kayıtlar repository'lerde açıkça (aynı transaction'da) silinir,
// "kayıt var mı" kontrolleri de servis katmanında yapılır.

// İŞLEM (TRANSACTION): fn içindeki tüm sorgular ya birlikte kalıcı olur (COMMIT)
// ya da biri hata verirse hepsi geri alınır (ROLLBACK).
export async function withTransaction(fn) {
  const tx = await requireDb().raw.transaction('write');
  try {
    const result = await fn(wrap(tx));
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  } finally {
    tx.close();
  }
}
