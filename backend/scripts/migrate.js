// Basit migration çalıştırıcı:  npm run db:migrate
// - db/migrations/ içindeki .sql dosyalarını ad sırasıyla çalıştırır (001_, 002_, ...).
// - Çalıştırılanları schema_migrations tablosuna yazar; aynı dosya ikinci kez çalışmaz.
// - Her dosya kendi transaction'ı içinde çalışır (BEGIN ... COMMIT): hata olursa o dosyanın
//   tüm değişiklikleri geri alınır.
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { pool, NOW } from '../src/config/db.js';

if (!pool) {
  console.error('TURSO_DATABASE_URL tanımlı değil. backend/.env dosyasına Turso veritabanı adresini ekleyin.');
  process.exit(1);
}

const dir = new URL('../db/migrations/', import.meta.url);

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name   TEXT PRIMARY KEY,
    run_at TEXT NOT NULL DEFAULT (${NOW})
  )`);

  const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  let count = 0;

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(new URL(file, dir), 'utf8');
    const safeName = file.replace(/'/g, "''");
    try {
      // executeMultiple: trigger gövdeleri gibi çok ifadeli SQL betiklerini tek seferde çalıştırır
      await pool.raw.executeMultiple(
        `BEGIN;\n${sql}\nINSERT INTO schema_migrations (name) VALUES ('${safeName}');\nCOMMIT;`
      );
    } catch (err) {
      await pool.raw.execute('ROLLBACK').catch(() => {});
      throw err;
    }
    console.log(`✔ ${file}`);
    count++;
  }
  console.log(count ? `${count} migration uygulandı.` : 'Veritabanı güncel, yeni migration yok.');
} catch (err) {
  console.error('Migration başarısız, değişiklikler geri alındı:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
