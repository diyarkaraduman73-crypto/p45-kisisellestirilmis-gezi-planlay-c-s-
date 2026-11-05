import 'dotenv/config';
import app from './app.js';
import { hasDb } from './config/db.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT} adresinde çalışıyor (veri: ${hasDb() ? 'PostgreSQL' : 'bellek'})`);
});
