// ENTEGRASYON TESTİ (uçtan uca): kullanıcı → veritabanı → Modül A (profil + katalog) → Modül B (rota + paylaşım)
//
// Çalışan bir API'ye gerçek HTTP istekleri atar; hiçbir katman taklit (mock) edilmez.
//   1. terminal:  npm run db:setup && npm run dev
//   2. terminal:  npm run test:entegrasyon
// Yayındaki sunucuya karşı:  API_URL=https://<servis>.onrender.com npm run test:entegrasyon
//
// Test her çalıştığında yeni, sentetik bir kullanıcı açar (test-<zaman>@example.com) ve sonunda rotasını siler.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const API = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
let token = null;

async function call(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data };
}

let skip = false;
before(async () => {
  try {
    const { data } = await call('GET', '/api/health', null, false);
    if (data?.database !== 'postgres') skip = 'API veritabanısız (bellek) modda; DATABASE_URL tanımlayın';
  } catch {
    skip = `API'ye ulaşılamadı (${API}); önce "npm run dev" çalıştırın`;
  }
});

// Adımlar sırayla çalışır ve birbirinin sonucunu kullanır (gerçek kullanıcı akışı)
const ctx = {};

test('1) Sağlık: API ayakta, sürüm ve veritabanı bilgisi var', async (t) => {
  if (skip) return t.skip(skip);
  const { status, data } = await call('GET', '/api/health', null, false);
  assert.equal(status, 200);
  assert.match(data.version, /^\d+\.\d+\.\d+$/);
});

test('2) Kimlik: kayıt → token, /me aynı kullanıcı', async (t) => {
  if (skip) return t.skip(skip);
  ctx.email = `test-${Date.now()}@example.com`;
  const reg = await call('POST', '/api/auth/register', { fullName: 'Entegrasyon Testi', email: ctx.email, password: 'Deneme1234!' }, false);
  assert.equal(reg.status, 201, JSON.stringify(reg.data));
  token = reg.data.token;
  ctx.userId = reg.data.user.id;
  const me = await call('GET', '/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.data.email, ctx.email);
});

test('3) Yetki: girişsiz planlama 401', async (t) => {
  if (skip) return t.skip(skip);
  const r = await call('POST', '/api/trips/plan', { days: 1 }, false);
  assert.equal(r.status, 401);
});

test('4) Modül A: ilgi profili kaydedilir, öneriler profile göre puanlanır', async (t) => {
  if (skip) return t.skip(skip);
  const empty = await call('POST', '/api/trips/plan', { days: 1 });
  assert.equal(empty.status, 400, 'profilde ilgi yokken plan üretilmemeli (R5)');

  const p = await call('PUT', '/api/profile', {
    interests: [{ slug: 'tarih', weight: 5 }, { slug: 'manzara', weight: 4 }, { slug: 'doga', weight: 2 }],
    budget: 'orta', pace: 'normal',
  });
  assert.equal(p.status, 200, JSON.stringify(p.data));
  const rec = await call('GET', '/api/pois/for-me');
  assert.equal(rec.status, 200);
  assert.ok(rec.data.length > 0);
  assert.ok(rec.data.every((x) => typeof x.score === 'number' && Array.isArray(x.reasons)));
});

test('5) Modül B: önizleme profil + kısıtlara uyar', async (t) => {
  if (skip) return t.skip(skip);
  const pois = await call('GET', '/api/pois?q=Emirgan', null, false);
  ctx.emirganId = pois.data.find((x) => x.name.includes('Emirgan'))?.id;
  assert.ok(ctx.emirganId, 'katalogda Emirgan Korusu olmalı (seed)');

  ctx.params = { city: 'İstanbul', days: 2, dayStart: '09:00', dayEnd: '19:00', pace: 'normal', mustInclude: [ctx.emirganId], startDate: '2026-12-05' };
  const r = await call('POST', '/api/trips/plan', ctx.params);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  ctx.preview = r.data;
  const items = r.data.days.flatMap((d) => d.items);
  assert.ok(items.some((it) => it.poi_id === ctx.emirganId), 'zorunlu yer planda');
  assert.equal(new Set(items.map((it) => it.poi_id)).size, items.length, 'POI tekrar etmez (R4)');
  assert.ok(items.every((it) => it.start_time >= '09:00' && it.end_time <= '19:00'), 'pencere içinde (R2)');
});

test('6) Doğrulama: geçersiz girdiler 400 (500 değil)', async (t) => {
  if (skip) return t.skip(skip);
  for (const bad of [
    { days: 8 },                                   // R1
    { dayStart: '05:00' },                         // R2
    { dayStart: '10:00', dayEnd: '12:00' },        // R2
    { mustInclude: [1], exclude: [1] },            // R8
    { startDate: '2026-02-30' },                   // Hafta 8 düzeltmesi
  ]) {
    const r = await call('POST', '/api/trips/plan', { ...ctx.params, mustInclude: [], ...bad });
    assert.equal(r.status, 400, `${JSON.stringify(bad)} → ${r.status}`);
  }
});

test('7) Kaydet: sunucuda yeniden üretilen plan önizlemeyle aynı (R9), tarih kaymaz', async (t) => {
  if (skip) return t.skip(skip);
  const r = await call('POST', '/api/trips/generate', { ...ctx.params, title: 'Entegrasyon rotası' });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  ctx.tripId = r.data.trip.id;
  const saved = r.data.trip.days.map((d) => d.items.map((it) => [it.poi_id, it.start_time, it.end_time]));
  const prev = ctx.preview.days.map((d) => d.items.map((it) => [it.poi_id, it.start_time, it.end_time]));
  assert.deepEqual(saved, prev);
  assert.equal(String(r.data.trip.start_date).slice(0, 10), '2026-12-05', 'DATE saat dilimi yüzünden kaymamalı');
});

test('8) Rotalarım: kullanıcı kendi rotasını görür, başkasınınkini göremez', async (t) => {
  if (skip) return t.skip(skip);
  const mine = await call('GET', `/api/users/${ctx.userId}/trips`);
  assert.equal(mine.status, 200);
  assert.ok(mine.data.some((x) => x.id === ctx.tripId && x.stop_count > 0));
  const other = await call('GET', `/api/users/${ctx.userId === 1 ? 2 : 1}/trips`);
  assert.equal(other.status, 403);
});

test('9) Paylaşım: varsayılan kapalı → aç → herkese açık sayfa → yenile → eski bağlantı 404', async (t) => {
  if (skip) return t.skip(skip);
  const detail = await call('GET', `/api/trips/${ctx.tripId}`);
  assert.equal(detail.data.is_public, false, 'R10: yeni rota paylaşıma kapalı');
  assert.equal((await call('GET', `/api/trips/shared/${detail.data.share_code}`, null, false)).status, 404);

  const on = await call('POST', `/api/trips/${ctx.tripId}/share`, { isPublic: true });
  assert.equal(on.status, 200);
  const pub = await call('GET', `/api/trips/shared/${on.data.shareCode}`, null, false);
  assert.equal(pub.status, 200);
  assert.equal(pub.data.user_id, undefined, 'R11: sahip gizli');
  assert.equal(pub.data.start_lat, undefined, 'R11: başlangıç konumu gizli');

  const renewed = await call('POST', `/api/trips/${ctx.tripId}/share`, { isPublic: true, regenerate: true });
  assert.notEqual(renewed.data.shareCode, on.data.shareCode);
  assert.equal((await call('GET', `/api/trips/shared/${on.data.shareCode}`, null, false)).status, 404);
});

test('9b) Harita (H9): gün yolu döner; servis yoksa düz çizgi + uyarı, paylaşımda da çalışır', async (t) => {
  if (skip) return t.skip(skip);
  const day1 = ctx.preview.days[0];
  const r = await call('GET', `/api/trips/${ctx.tripId}/days/1/path`);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.ok(['openrouteservice', 'duz-cizgi'].includes(r.data.source));
  assert.equal(r.data.legs.length, day1.items.length - 1, 'başlangıç noktası yok: bacak = durak − 1');
  if (r.data.source === 'duz-cizgi') assert.ok(r.data.warning, 'yedeğe düşünce kullanıcıya neden söylenmeli');

  assert.equal((await call('GET', `/api/trips/${ctx.tripId}/days/9/path`)).status, 400);
  const code = (await call('POST', `/api/trips/${ctx.tripId}/share`, { isPublic: true })).data.shareCode;
  assert.equal((await call('GET', `/api/trips/shared/${code}/days/1/path`, null, false)).status, 200);
  const ankara = await call('POST', '/api/routing/path', { points: [{ lat: 41.0, lng: 28.97 }, { lat: 39.93, lng: 32.85 }] });
  assert.equal(ankara.status, 400, 'şehir dışı noktalar için servisimiz vekil olarak kullanılamaz');
});

test('9c) Yapay zekâ (H10): rehber üretilir, doğrulanmış; öneriler planda değil; kaynak açık', async (t) => {
  if (skip) return t.skip(skip);
  const r = await call('POST', `/api/trips/${ctx.tripId}/guide`);
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const g = r.data;
  assert.ok(['yapay-zeka', 'sablon'].includes(g.kaynak));
  assert.ok(g.istem_surumu && g.genel_bakis);
  assert.equal(g.gunler.length, ctx.preview.days.length, 'her gün için bir bölüm');
  const planIds = new Set(ctx.preview.days.flatMap((d) => d.items.map((i) => i.poi_id)));
  assert.ok(g.oneriler.length <= 3 && g.oneriler.every((o) => !planIds.has(o.poi_id)), 'Y3');
  for (const d of g.gunler) {
    const dayIds = new Set(ctx.preview.days.find((x) => x.day_number === d.gun).items.map((i) => i.poi_id));
    assert.ok(d.ipuclari.every((tip) => dayIds.has(tip.poi_id)), 'D4: ipucu yalnızca o günün duraklarına');
  }
  if (g.kaynak === 'sablon') assert.ok(g.uyarilar.length, 'şablona düşünce neden yazılmalı');

  assert.deepEqual((await call('GET', `/api/trips/${ctx.tripId}`)).data.ai_guide.genel_bakis, g.genel_bakis, 'kaydedildi');
  assert.equal((await call('GET', '/api/ai-logs')).status, 403, 'günlük yalnızca yöneticiye açık');
});

test('10) Temizlik: rota silinir, çıkıştan sonra token geçersiz', async (t) => {
  if (skip) return t.skip(skip);
  assert.equal((await call('DELETE', `/api/trips/${ctx.tripId}`)).status, 204);
  assert.equal((await call('GET', `/api/trips/${ctx.tripId}`)).status, 404);
  assert.equal((await call('POST', '/api/auth/logout')).status, 204);
  assert.equal((await call('GET', '/api/auth/me')).status, 401);
});
