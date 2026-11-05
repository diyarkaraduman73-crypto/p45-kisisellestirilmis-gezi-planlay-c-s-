// Veri katmanı yapılandırması: PostgreSQL bağlantı havuzu.
// DATABASE_URL tanımlı değilse pool null olur ve repository'ler bellekteki seed verisini kullanır.
import pg from 'pg';

const { DATABASE_URL } = process.env;

export const pool = DATABASE_URL
  ? new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 5,
    })
  : null;

export const hasDb = () => pool !== null;
