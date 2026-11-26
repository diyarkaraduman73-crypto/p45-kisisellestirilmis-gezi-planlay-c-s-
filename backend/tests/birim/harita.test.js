// BİRİM TESTİ: Harita entegrasyonu (Hafta 9) — gerçek servise gitmeden, sahte fetch ile
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJson, ExternalServiceError } from '../../src/utils/httpClient.js';
import { createRateLimiter, createTtlCache } from '../../src/utils/rateLimit.js';
import { createRoutingService, parseOrsGeojson, dayPoints, validatePoints } from '../../src/services/routingService.js';

const KEY = 'test-anahtari-123';
const quiet = { warn() {} };

// Sahte yanıt üretici
const reply = (status, body, headers = {}) => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: (h) => headers[h.toLowerCase()] ?? null },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

// Sırayla verilen yanıtları döndüren sahte fetch; çağrıları kaydeder
function fakeFetch(...responses) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const r = responses[Math.min(calls.length - 1, responses.length - 1)];
    if (r instanceof Error) throw r;
    if (r === 'asili') {
      return new Promise((_, reject) => init.signal.addEventListener('abort', () => {
        const e = new Error('aborted'); e.name = 'AbortError'; reject(e);
      }));
    }
    return r;
  };
  fn.calls = calls;
  return fn;
}

// openrouteservice GeoJSON yanıtı örneği: 3 durak, 2 bacak
const ORS_OK = {
  type: 'FeatureCollection',
  features: [{
    geometry: { type: 'LineString', coordinates: [[28.98, 41.0086], [28.979, 41.0085], [28.9779, 41.0084], [28.977, 41.006], [28.9768, 41.0054]] },
    properties: {
      way_points: [0, 2, 4],
      summary: { distance: 812.4, duration: 584.9 },
      segments: [{ distance: 230.2, duration: 165.7 }, { distance: 582.2, duration: 419.2 }],
    },
  }],
};
const P = [{ lat: 41.0086, lng: 28.98 }, { lat: 41.0084, lng: 28.9779 }, { lat: 41.0054, lng: 28.9768 }];

// ---------- httpClient ----------

test('fetchJson: zaman aşımında istek iptal edilir → 504', async () => {
  const f = fakeFetch('asili');
  await assert.rejects(fetchJson('https://ornek.test/x', { fetchImpl: f, timeoutMs: 30, retries: 0, service: 'Deneme' }),
    (e) => e instanceof ExternalServiceError && e.status === 504 && e.kind === 'zaman-asimi');
});

test('fetchJson: 5xx bir kez yeniden denenir, ikinci deneme başarılı', async () => {
  const f = fakeFetch(reply(503, 'meşgul'), reply(200, { ok: 1 }));
  assert.deepEqual(await fetchJson('https://ornek.test/x', { fetchImpl: f, retries: 1, backoffMs: 1 }), { ok: 1 });
  assert.equal(f.calls.length, 2);
});

test('fetchJson: kısa Retry-After ile 429 beklenip tekrar denenir', async () => {
  const f = fakeFetch(reply(429, {}, { 'retry-after': '0' }), reply(200, { ok: 2 }));
  assert.deepEqual(await fetchJson('https://ornek.test/x', { fetchImpl: f, retries: 1 }), { ok: 2 });
});

test('fetchJson: uzun Retry-After ile 429 → 503 ve retryAfter', async () => {
  const f = fakeFetch(reply(429, {}, { 'retry-after': '60' }));
  await assert.rejects(fetchJson('https://ornek.test/x', { fetchImpl: f, retries: 1 }),
    (e) => e.status === 503 && e.retryAfter === 60 && e.kind === 'hiz-siniri');
  assert.equal(f.calls.length, 1, 'uzun beklemede tekrar denenmez');
});

test('fetchJson: 401/403 yeniden denenmez, mesajda anahtar ve URL sorgusu yok', async () => {
  const f = fakeFetch(reply(403, { error: 'Access disallowed' }));
  await assert.rejects(fetchJson(`https://ornek.test/x?api_key=${KEY}`, { fetchImpl: f, retries: 2 }),
    (e) => e.kind === 'anahtar' && !e.message.includes(KEY));
  assert.equal(f.calls.length, 1);
});

test('fetchJson: ağ hatası ve bozuk JSON sınıflandırılır', async () => {
  await assert.rejects(fetchJson('https://ornek.test/x', { fetchImpl: fakeFetch(new TypeError('fetch failed')), retries: 0 }),
    (e) => e.status === 503 && e.kind === 'ag');
  await assert.rejects(fetchJson('https://ornek.test/x', { fetchImpl: fakeFetch(reply(200, '<html>')), retries: 0 }),
    (e) => e.status === 502 && e.kind === 'yanit');
});

// ---------- hız sınırı ve önbellek ----------

test('createRateLimiter: pencere dolunca reddeder, süre geçince açılır', () => {
  let t = 0;
  const l = createRateLimiter({ max: 2, windowMs: 1000, now: () => t });
  assert.ok(l.take('a').ok); assert.ok(l.take('a').ok);
  const r = l.take('a');
  assert.equal(r.ok, false); assert.equal(r.retryAfter, 1);
  assert.ok(l.take('b').ok, 'anahtarlar birbirinden bağımsız');
  t = 1001;
  assert.ok(l.take('a').ok);
});

test('createTtlCache: süre dolunca kayıt silinir, boyut sınırı uygulanır', () => {
  let t = 0;
  const c = createTtlCache({ max: 2, ttlMs: 100, now: () => t });
  c.set('a', 1); c.set('b', 2); c.set('c', 3);
  assert.equal(c.get('a'), undefined); assert.equal(c.get('c'), 3);
  t = 101;
  assert.equal(c.get('c'), undefined);
});

// ---------- rota servisi ----------

test('parseOrsGeojson: [boylam,enlem] → [enlem,boylam], way_points ile bacaklara bölünür', () => {
  const r = parseOrsGeojson(ORS_OK, ['yuruyus', 'yuruyus']);
  assert.equal(r.source, 'openrouteservice');
  assert.equal(r.legs.length, 2);
  assert.deepEqual(r.legs[0].coordinates[0], [41.0086, 28.98]);
  assert.deepEqual(r.legs[0].coordinates.at(-1), r.legs[1].coordinates[0], 'bacaklar uç uca bağlı');
  assert.equal(r.distance_km, 0.81);
  assert.equal(r.legs[1].walk_min, 7);
});

test('anahtar yoksa servise gidilmez, düz çizgi + uyarı', async () => {
  const f = fakeFetch(reply(200, ORS_OK));
  const s = createRoutingService({ apiKey: '', fetchImpl: f, logger: quiet });
  const r = await s.walkingPath(P, ['yuruyus', 'yuruyus']);
  assert.equal(r.source, 'duz-cizgi');
  assert.match(r.warning, /ORS_API_KEY/);
  assert.equal(f.calls.length, 0);
});

test('doğru adres ve başlık: anahtar Authorization başlığında, URL\'de değil; yeni HeiGIT adresi', async () => {
  const f = fakeFetch(reply(200, ORS_OK));
  const s = createRoutingService({ apiKey: KEY, fetchImpl: f, logger: quiet });
  const r = await s.walkingPath(P, []);
  assert.equal(r.source, 'openrouteservice');
  const { url, init } = f.calls[0];
  assert.equal(url, 'https://api.heigit.org/openrouteservice/v2/directions/foot-walking/geojson');
  assert.ok(!url.includes(KEY));
  assert.equal(init.headers.Authorization, KEY);
  assert.deepEqual(JSON.parse(init.body).coordinates[0], [28.98, 41.0086], 'ORS [boylam, enlem] bekler');
});

test('aynı noktalar ikinci kez önbellekten gelir (kota harcanmaz)', async () => {
  const f = fakeFetch(reply(200, ORS_OK));
  const s = createRoutingService({ apiKey: KEY, fetchImpl: f, logger: quiet });
  await s.walkingPath(P, ['yuruyus', 'yuruyus']);
  const r = await s.walkingPath(P, ['toplu-tasima', 'yuruyus']);
  assert.equal(f.calls.length, 1);
  assert.equal(r.cached, true);
  assert.equal(r.legs[0].mode, 'toplu-tasima', 'bacak türü önbellekten değil o anki plandan');
});

test('dakikalık sınır dolunca servise gidilmez, düz çizgi + kaç saniye sonra', async () => {
  const f = fakeFetch(reply(200, ORS_OK));
  const s = createRoutingService({ apiKey: KEY, fetchImpl: f, logger: quiet, limiter: createRateLimiter({ max: 1, windowMs: 60_000 }) });
  await s.walkingPath(P, []);
  const r = await s.walkingPath([P[1], P[2]], []);
  assert.equal(r.source, 'duz-cizgi');
  assert.match(r.warning, /sınır/);
  assert.equal(f.calls.length, 1);
});

test('servis hata verirse uygulama çökmez: düz çizgi ve anlaşılır uyarı', async () => {
  for (const [resp, word] of [[reply(403, {}), 'anahtar'], [reply(500, {}), 'ulaşılamıyor'], [reply(200, { features: [] }), 'ulaşılamıyor']]) {
    const s = createRoutingService({ apiKey: KEY, fetchImpl: fakeFetch(resp), logger: quiet });
    const r = await s.walkingPath(P, []);
    assert.equal(r.source, 'duz-cizgi');
    assert.match(r.warning, new RegExp(word));
    assert.equal(r.legs.length, 2);
  }
});

test('dayPoints: başlangıç varsa ilk bacak ondan, yoksa ilk duraktan başlar', () => {
  const day = { items: [{ lat: 1, lng: 1, travel_mode: 'toplu-tasima' }, { lat: 2, lng: 2, travel_mode: 'yuruyus' }] };
  assert.deepEqual(dayPoints(day, { lat: 0, lng: 0 }).modes, ['toplu-tasima', 'yuruyus']);
  const r = dayPoints(day, null);
  assert.equal(r.points.length, 2);
  assert.deepEqual(r.modes, ['yuruyus']);
});

test('validatePoints: sayı sınırı ve şehir dışı nokta reddedilir', () => {
  const city = { name: 'İstanbul', center_lat: 41.0082, center_lng: 28.9784, radius_km: 60 };
  assert.ok(validatePoints(P, city).points);
  assert.match(validatePoints([P[0]], city).error, /2 ile 12/);
  assert.match(validatePoints(Array(13).fill(P[0]), city).error, /2 ile 12/);
  assert.match(validatePoints([P[0], { lat: 39.93, lng: 32.85 }], city).error, /hizmet alanının dışında/); // Ankara
  assert.match(validatePoints([P[0], { lat: 'x', lng: 1 }], city).error, /geçersiz/);
});
