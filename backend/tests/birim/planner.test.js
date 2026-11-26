// BİRİM TESTİ: Rota ve Gün Planı Üretimi çekirdeği (planner.js)
// Veritabanı ve sunucu gerekmez:  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan, schedule, travel, twoOpt, toMin, PACE } from '../../src/services/planner.js';
import { POIS } from '../../src/data/seed.js';

// Profil puanlamasının sade hâli (profileService.scoreForProfile ile aynı formül: ilgi düzeyi × 20)
const WEIGHTS = { tarih: 5, manzara: 4, doga: 2, sanat: 3 };
const candidates = POIS.filter((p) => WEIGHTS[p.interest]).map((p) => ({ ...p, score: WEIGHTS[p.interest] * 20 }));
const base = { days: 2, pace: 'normal', dayStart: '09:00', dayEnd: '19:00', start: null, mustInclude: [] };

// Planın kısıtlara uyup uymadığını plan üreticiden bağımsız olarak kontrol eder
function violations(plan, params) {
  const out = [];
  const pace = PACE[params.pace];
  const maxKm = params.maxDailyKm ?? pace.maxDailyKm;
  const seen = new Set();
  for (const d of plan.days) {
    if (d.items.length > pace.maxStops) out.push(`${d.day_number}. gün durak sınırı aşıldı`);
    if (d.totals.km > maxKm + 1e-9) out.push(`${d.day_number}. gün km sınırı aşıldı`);
    let prevEnd = toMin(params.dayStart);
    for (const it of d.items) {
      if (seen.has(it.poi_id)) out.push(`POI ${it.poi_id} tekrar ediyor`);
      seen.add(it.poi_id);
      if (toMin(it.start_time) < toMin(params.dayStart)) out.push('pencere öncesi');
      if (toMin(it.end_time) > toMin(params.dayEnd)) out.push('pencere sonrası');
      if (toMin(it.start_time) < prevEnd + it.travel_minutes) out.push('yol süresiyle çakışma');
      prevEnd = toMin(it.end_time);
    }
  }
  return out;
}

test('normal tempo, 2 gün: kısıt ihlali yok ve her gün durak var', () => {
  const plan = generatePlan(candidates, base);
  assert.deepEqual(violations(plan, base), []);
  assert.equal(plan.days.length, 2);
  assert.ok(plan.days.every((d) => d.items.length > 0));
});

test('farklı parametre bileşimlerinde kısıt ihlali yok', () => {
  for (const pace of ['sakin', 'normal', 'yogun']) {
    for (const [dayStart, dayEnd] of [['09:00', '19:00'], ['10:00', '13:00'], ['08:00', '22:00']]) {
      for (const days of [1, 3]) {
        const params = { ...base, pace, dayStart, dayEnd, days };
        assert.deepEqual(violations(generatePlan(candidates, params), params), [], `${pace} ${dayStart}-${dayEnd} ${days}g`);
      }
    }
  }
});

test('deterministik: aday sırası değişse de aynı plan', () => {
  const a = generatePlan(candidates, base);
  const b = generatePlan([...candidates].reverse(), base);
  assert.deepEqual(a, b);
});

test('tempo durak sayısını belirler (sakin ≤ 3)', () => {
  const plan = generatePlan(candidates, { ...base, pace: 'sakin' });
  assert.ok(plan.days.every((d) => d.items.length <= 3));
});

test('zorunlu yer düşük puanlı olsa da plana girer', () => {
  const emirgan = 15;
  const plan = generatePlan(candidates.map((c) => (c.id === emirgan ? { ...c, score: 0 } : c)), { ...base, mustInclude: [emirgan] });
  assert.ok(plan.days.some((d) => d.items.some((it) => it.poi_id === emirgan)));
  assert.equal(plan.unplaced.length, 0);
});

test('sığmayan zorunlu yer sessizce atılmaz, gerekçesiyle raporlanır', () => {
  const longVisit = candidates.map((c) => (c.id === 3 ? { ...c, visit_minutes: 400 } : c)); // 6,5 saatlik ziyaret
  const params = { ...base, days: 1, dayStart: '10:00', dayEnd: '13:00', mustInclude: [3] };
  const plan = generatePlan(longVisit, params);
  assert.equal(plan.unplaced.length, 1);
  assert.equal(plan.unplaced[0].poi_id, 3);
  assert.ok(plan.warnings.some((w) => w.includes('zorunlu')));
});

test('schedule: pencereye sığmayan dizi null döner', () => {
  const stops = candidates.slice(0, 3);
  assert.equal(schedule(null, stops, { dayStart: toMin('09:00'), dayEnd: toMin('09:30'), bufferMin: 10 }), null);
});

test('travel: kısa mesafe yürüyüş, uzun mesafe toplu taşıma', () => {
  const ayasofya = POIS.find((p) => p.id === 1);
  const yerebatan = POIS.find((p) => p.id === 4);
  const emirgan = POIS.find((p) => p.id === 15);
  assert.equal(travel(ayasofya, yerebatan).mode, 'yuruyus');
  assert.equal(travel(ayasofya, emirgan).mode, 'toplu-tasima');
  assert.deepEqual(travel(null, ayasofya), { km: 0, minutes: 0, mode: null });
});

test('twoOpt: zikzak sırayı kısaltır', () => {
  const byId = (id) => POIS.find((p) => p.id === id);
  const zigzag = [byId(1), byId(15), byId(4), byId(16)]; // Sultanahmet ↔ Sarıyer gidip gelme
  const km = (arr) => arr.slice(1).reduce((a, s, i) => a + travel(arr[i], s).km, 0);
  assert.ok(km(twoOpt(null, zigzag)) < km(zigzag));
});
