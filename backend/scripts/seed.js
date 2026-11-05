// Örnek / SENTETİK veri yükler:  npm run db:seed   (sıfırlayıp yüklemek için: npm run db:seed -- --reset)
//
// KVKK notu: Buradaki kişiler GERÇEK DEĞİLDİR. Adlar "Deneme Kullanıcı NN" biçiminde,
// e-postalar yalnızca test için ayrılmış example.com alan adındadır (RFC 2606),
// şifreler herkes için aynı sahte değerin özetidir. Gerçek kişisel veri kullanılmaz.
import 'dotenv/config';
import { pool, withTransaction } from '../src/config/db.js';
import { CITIES, INTERESTS, POIS, TAGS } from '../src/data/seed.js';
import { hashPassword } from '../src/utils/password.js';
import * as userRepository from '../src/repositories/userRepository.js';
import * as tripRepository from '../src/repositories/tripRepository.js';

if (!pool) {
  console.error('DATABASE_URL tanımlı değil.');
  process.exit(1);
}

const USER_COUNT = 12;
const DEMO_PASSWORD = 'Deneme1234!';

// Her çalıştırmada aynı sonucu üreten basit sözde-rastgele üreteç (tekrarlanabilir veri)
let state = 42;
const rand = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const sample = (arr, n) => [...arr].sort(() => rand() - 0.5).slice(0, n);

try {
  if (process.argv.includes('--reset')) {
    await pool.query(`TRUNCATE day_plan_items, day_plans, trips, user_interests, user_preferences,
                      sessions, poi_tags, tags, users, pois, interests, cities RESTART IDENTITY CASCADE`);
    console.log('Tablolar boşaltıldı.');
  }

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM users');
  if (rows[0].n > 0) {
    console.log(`users tablosunda zaten ${rows[0].n} kayıt var. Yeniden yüklemek için: npm run db:seed -- --reset`);
    process.exit(0);
  }

  // 1) Referans verileri: şehirler, ilgi alanları, POI'ler (tek transaction)
  await withTransaction(async (client) => {
    for (const c of CITIES) {
      await client.query(
        `INSERT INTO cities (name, country, center_lat, center_lng, radius_km) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name, country) DO UPDATE
           SET center_lat = EXCLUDED.center_lat, center_lng = EXCLUDED.center_lng, radius_km = EXCLUDED.radius_km`,
        [c.name, c.country, c.center_lat, c.center_lng, c.radius_km]
      );
    }
    for (const i of INTERESTS) {
      await client.query('INSERT INTO interests (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING', [i.slug, i.name]);
    }
    for (const t of TAGS) {
      await client.query('INSERT INTO tags (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING', [t.slug, t.name]);
    }
    for (const p of POIS) {
      const { rows: [poi] } = await client.query(
        `INSERT INTO pois (city_id, interest_id, name, description, district, lat, lng, visit_minutes, price_level)
         VALUES ((SELECT id FROM cities WHERE name = $1), (SELECT id FROM interests WHERE slug = $2),
                 $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [p.city, p.interest, p.name, p.description, p.district, p.lat, p.lng, p.visit_minutes, p.price_level]
      );
      await client.query(
        `INSERT INTO poi_tags (poi_id, tag_id) SELECT $1, id FROM tags WHERE slug = ANY($2::text[])`,
        [poi.id, p.tags]
      );
    }
  });
  console.log(`✔ ${CITIES.length} şehir, ${INTERESTS.length} ilgi alanı, ${TAGS.length} etiket, ${POIS.length} POI`);

  const dbPois = (await pool.query('SELECT p.id, i.slug FROM pois p JOIN interests i ON i.id = p.interest_id')).rows;
  const cityId = (await pool.query('SELECT id FROM cities WHERE name = $1', ['İstanbul'])).rows[0].id;
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const slugs = INTERESTS.map((i) => i.slug);
  let tripCount = 0;

  // 2) Yönetici hesabı (sentetik) — yönetim paneli demosu için
  await userRepository.create({
    fullName: 'Deneme Yönetici',
    email: 'yonetici@example.com',
    passwordHash,
    role: 'yonetici',
    interestSlugs: ['tarih'],
  });

  // 3) Sentetik gezgin kullanıcılar + rotalar (CRUD fonksiyonları üzerinden)
  for (let n = 1; n <= USER_COUNT; n++) {
    const no = String(n).padStart(2, '0');
    const interests = sample(slugs, 2 + Math.floor(rand() * 3));
    const weighted = interests.map((slug) => ({ slug, weight: 1 + Math.floor(rand() * 5) })); // ilgi düzeyi 1-5
    const user = await userRepository.create({
      fullName: `Deneme Kullanıcı ${no}`,
      email: `kullanici${no}@example.com`,
      passwordHash,
      preferences: { budget: pick(['dusuk', 'orta', 'yuksek']), pace: pick(['sakin', 'normal', 'yogun']) },
      interestSlugs: weighted,
    });

    const tripTotal = n % 3 === 0 ? 0 : 1 + (n % 2); // bazı kullanıcıların rotası yok
    for (let t = 1; t <= tripTotal; t++) {
      const dayCount = 1 + Math.floor(rand() * 3);
      const pool_ = dbPois.filter((p) => interests.includes(p.slug));
      const candidates = sample(pool_.length >= 3 ? pool_ : dbPois, dayCount * 3);
      const days = Array.from({ length: dayCount }, (_, d) => ({
        dayNumber: d + 1,
        summary: `${d + 1}. gün örnek planı`,
        items: candidates.slice(d * 3, d * 3 + 3).map((p, k) => ({ poiId: p.id, startTime: `${String(9 + k * 3).padStart(2, '0')}:00` })),
      }));
      const start = new Date(Date.UTC(2026, 11, 1 + Math.floor(rand() * 60)));
      await tripRepository.create({
        userId: user.id,
        cityId,
        title: `İstanbul gezisi #${t}`,
        startDate: start.toISOString().slice(0, 10),
        dayCount,
        shareCode: `demo${no}${t}`,
        days,
      });
      tripCount++;
    }
  }
  console.log(`✔ 1 yönetici (yonetici@example.com), ${USER_COUNT} gezgin (kullanici01..${String(USER_COUNT).padStart(2, '0')}@example.com), ${tripCount} rota`);
  console.log(`  Tüm demo hesapların parolası: ${DEMO_PASSWORD}`);
} catch (err) {
  console.error('Seed başarısız:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
