// Basit migration çalıştırıcı:  npm run db:migrate
// - db/migrations/ içindeki .sql dosyalarını ad sırasıyla çalıştırır (001_, 002_, ...).
// - Çalıştırılanları schema_migrations tablosuna yazar; aynı dosya ikinci kez çalışmaz.
// - Her dosya kendi transaction'ı içinde çalışır: hata olursa o dosyanın tüm değişiklikleri geri alınır.
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { pool, withTransaction } from '../src/config/db.js';

if (!pool) {
  console.error('DATABASE_URL tanımlı değil. backend/.env dosyasına Neon bağlantı adresini ekleyin.');
  process.exit(1);
}

const dir = new URL('../db/migrations/', import.meta.url);

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name   TEXT PRIMARY KEY,
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  let count = 0;

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(new URL(file, dir), 'utf8');
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
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
