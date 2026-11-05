// ÇEKİRDEK MANTIK: Rota ve gün planı üretimi.
// Veritabanı ve HTTP'den bağımsız SAF fonksiyonlar → tek başına test edilebilir.
// Ayrıntılı açıklama: docs/moduller/rota-gun-plani.md
//
// Girdi : puanlanmış aday POI'ler + parametreler (gün sayısı, tempo, gün penceresi, başlangıç noktası...)
// Çıktı : gün gün sıralı duraklar (saat, yol süresi, mesafe), toplamlar, uyarılar, yerleştirilemeyenler
//
// Yöntem (her gün için):
//   0) Çapa: günün odak bölgesi = kalan en değerli yer (önceki günlerin bölgelerinden uzak olanı tercih edilir)
//   1) Açgözlü (greedy) seçim: kısıtları bozmayan adaylar arasında "fayda" değeri en yüksek olan seçilir.
//      fayda = puan − yol süresi cezası − çapadan uzaklık cezası − aynı kategori cezası
//      (zorunlu POI'ler büyük öncelik alır).
//   2) 2-opt iyileştirme: günün durak sırası, toplam yol kısalacak şekilde ters çevrilerek denenir.
//   3) Zaman çizelgesi: gün başlangıcından itibaren yol + ziyaret + tampon + öğle arası eklenir.
//   Her adımda süre ve mesafe kısıtları kontrol edilir; bir POI rotada yalnızca bir kez yer alır.
import { distanceKm } from '../utils/geo.js';

// Tempoya göre günlük sınırlar
export const PACE = {
  sakin:  { maxStops: 3, bufferMin: 15, maxDailyKm: 12 },
  normal: { maxStops: 5, bufferMin: 10, maxDailyKm: 20 },
  yogun:  { maxStops: 7, bufferMin: 5,  maxDailyKm: 30 },
};

const ROUTE_FACTOR = 1.3;     // kuş uçuşu → gerçek yol yaklaşık %30 daha uzun
const WALK_KMH = 4.5;
const WALK_MAX_KM = 1.5;      // bunun üstü toplu taşıma kabul edilir
const TRANSIT_KMH = 18;
const TRANSIT_WAIT_MIN = 10;
const LUNCH = { from: 12 * 60, latest: 14 * 60, minutes: 60 };
const MUST_BONUS = 1000;

export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const roundUp5 = (n) => Math.ceil(n / 5) * 5;

// İki nokta arası yolculuk tahmini
export function travel(from, to) {
  if (!from) return { km: 0, minutes: 0, mode: null };
  const km = Math.round(distanceKm(from.lat, from.lng, to.lat, to.lng) * ROUTE_FACTOR * 100) / 100;
  if (km < 0.05) return { km: 0, minutes: 0, mode: null };
  if (km <= WALK_MAX_KM) return { km, minutes: roundUp5((km / WALK_KMH) * 60), mode: 'yuruyus' };
  return { km, minutes: roundUp5(TRANSIT_WAIT_MIN + (km / TRANSIT_KMH) * 60), mode: 'toplu-tasima' };
}

// Bir durak dizisinin zaman çizelgesini çıkarır. Pencereye sığmazsa null döner.
export function schedule(start, stops, { dayStart, dayEnd, bufferMin }) {
  let clock = dayStart;
  let pos = start;
  let km = 0;
  let lunch = null;
  const items = [];
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    // Öğle arası: saat 12:00'yi geçtiyse ve henüz verilmediyse, bir sonraki yolculuktan önce
    if (!lunch && items.length > 0 && clock >= LUNCH.from && clock <= LUNCH.latest && dayEnd - clock > LUNCH.minutes + 60) {
      lunch = { start: clock, end: clock + LUNCH.minutes };
      clock += LUNCH.minutes;
    }
    const t = travel(pos, s);
    const arrive = clock + t.minutes;
    const leave = arrive + s.visit_minutes;
    if (leave > dayEnd) return null;
    items.push({ poi: s, start: arrive, end: leave, travel: t });
    km += t.km;
    clock = leave + (i < stops.length - 1 ? bufferMin : 0);
    pos = s;
  }
  return { items, km: Math.round(km * 100) / 100, end: clock, lunch };
}

const totalKm = (start, stops) =>
  stops.reduce((acc, s, i) => acc + travel(i === 0 ? start : stops[i - 1], s).km, 0);

// 2-opt: sırayı ters çevirerek toplam yolu kısaltmayı dener (küçük n için yeterince hızlı)
export function twoOpt(start, stops) {
  if (stops.length < 3) return stops;
  let best = stops;
  let bestKm = totalKm(start, best);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const cand = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        const km = totalKm(start, cand);
        if (km + 0.01 < bestKm) { best = cand; bestKm = km; improved = true; }
      }
    }
  }
  return best;
}

// Günün "çapası": o gün ağırlıklı gezilecek bölgenin merkezi.
// Kalan en değerli yer seçilir; önceki günlerin çapalarına yakın olanlar cezalandırılır ki
// her gün farklı bir bölgeye odaklansın (Tarihi Yarımada günü, Boğaz günü gibi).
function pickAnchor(pool, used, mustIds, anchors) {
  let best = null;
  for (const p of pool) {
    if (used.has(p.id)) continue;
    const nearPrev = anchors.length ? Math.min(...anchors.map((a) => distanceKm(a.lat, a.lng, p.lat, p.lng))) : 99;
    const value = p.score + (mustIds.has(p.id) ? MUST_BONUS : 0) - Math.max(0, 3 - nearPrev) * 25;
    if (!best || value > best.value) best = { p, value };
  }
  return best?.p ?? null;
}

function buildDay(pool, used, mustIds, cfg, anchor) {
  const { start, dayStart, dayEnd, maxStops, maxDailyKm, bufferMin } = cfg;
  const stops = [];
  const perInterest = {};
  // Başlangıç noktası yoksa ilk durağa yol süresi 0 sayılır (gün, seçilen ilk yerde başlar)
  const origin = start;

  while (stops.length < maxStops) {
    let best = null;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const trial = [...stops, p];
      const sch = schedule(origin, trial, { dayStart, dayEnd, bufferMin });
      if (!sch || sch.km > maxDailyKm) continue;                     // süre ve mesafe kısıtı
      const last = sch.items[sch.items.length - 1];
      const fromAnchor = anchor ? distanceKm(anchor.lat, anchor.lng, p.lat, p.lng) : 0;
      const utility = p.score
        + (mustIds.has(p.id) ? MUST_BONUS : 0)
        - last.travel.minutes * 2                                      // uzak yer daha az cazip
        - fromAnchor * 8                                               // günün bölgesinden uzaklaşma
        - (perInterest[p.interest] || 0) * 15;                         // aynı gün aynı türden çok olmasın
      if (!best || utility > best.utility) best = { p, utility };
    }
    if (!best) break;
    stops.push(best.p);
    used.add(best.p.id);
    perInterest[best.p.interest] = (perInterest[best.p.interest] || 0) + 1;
  }

  const ordered = twoOpt(origin, stops);
  const sch = schedule(origin, ordered, { dayStart, dayEnd, bufferMin });
  // 2-opt sırası pencereye sığmazsa (çok nadir) açgözlü sıra kullanılır
  return sch && sch.km <= maxDailyKm ? sch : schedule(origin, stops, { dayStart, dayEnd, bufferMin });
}

// ANA FONKSİYON
// candidates: [{ id, name, lat, lng, interest, visit_minutes, score, ... }]
// params: { days, pace, dayStart 'HH:MM', dayEnd 'HH:MM', start {lat,lng}|null, mustInclude [id], maxDailyKm? }
export function generatePlan(candidates, params) {
  const pace = PACE[params.pace] ?? PACE.normal;
  const cfg = {
    start: params.start ?? null,
    dayStart: toMin(params.dayStart),
    dayEnd: toMin(params.dayEnd),
    maxStops: pace.maxStops,
    maxDailyKm: params.maxDailyKm ?? pace.maxDailyKm,
    bufferMin: pace.bufferMin,
  };
  const mustIds = new Set(params.mustInclude ?? []);

  // Deterministik sıra: puan, sonra id (aynı girdi → aynı plan; önizleme ile kayıt tutarlı olur)
  const pool = [...candidates].sort((a, b) => (mustIds.has(b.id) - mustIds.has(a.id)) || b.score - a.score || a.id - b.id);
  const used = new Set();
  const days = [];
  const warnings = [];

  const anchors = [];
  for (let d = 1; d <= params.days; d++) {
    const anchor = pickAnchor(pool, used, mustIds, anchors);
    if (anchor) anchors.push(anchor);
    const sch = buildDay(pool, used, mustIds, cfg, anchor);
    const items = (sch?.items ?? []).map((it, i) => ({
      poi_id: it.poi.id,
      name: it.poi.name,
      interest: it.poi.interest,
      lat: it.poi.lat,
      lng: it.poi.lng,
      visit_order: i + 1,
      visit_minutes: it.poi.visit_minutes,
      start_time: toHHMM(it.start),
      end_time: toHHMM(it.end),
      travel_minutes: it.travel.minutes,
      travel_km: it.travel.km,
      travel_mode: it.travel.mode,
      score: it.poi.score,
      must: mustIds.has(it.poi.id),
    }));
    const visit = items.reduce((a, x) => a + x.visit_minutes, 0);
    const travelMin = items.reduce((a, x) => a + x.travel_minutes, 0);
    days.push({
      day_number: d,
      items,
      lunch: sch?.lunch ? { start: toHHMM(sch.lunch.start), end: toHHMM(sch.lunch.end) } : null,
      totals: { stops: items.length, km: sch?.km ?? 0, visit_minutes: visit, travel_minutes: travelMin,
                ends_at: items.length ? items[items.length - 1].end_time : null },
      summary: items.length
        ? `${items.length} durak · ${items[0].start_time}–${items[items.length - 1].end_time} · ${(sch.km).toFixed(1)} km yol`
          + (sch.lunch ? ` · öğle arası ${toHHMM(sch.lunch.start)}` : '')
        : 'Bu gün için uygun yer kalmadı',
    });
    if (!items.length) warnings.push(`${d}. gün için kısıtlara uyan yer kalmadı; gün sayısını azaltmayı veya ilgi alanı eklemeyi deneyin.`);
  }

  const unplaced = [...mustIds]
    .filter((id) => !used.has(id))
    .map((id) => {
      const p = candidates.find((c) => c.id === id);
      return { poi_id: id, name: p?.name, reason: 'Gün penceresine veya günlük mesafe sınırına sığmadı' };
    });
  if (unplaced.length) warnings.push(`${unplaced.length} zorunlu yer plana sığmadı.`);

  const all = days.flatMap((d) => d.items);
  return {
    days,
    totals: {
      days: days.length,
      stops: all.length,
      km: Math.round(days.reduce((a, d) => a + d.totals.km, 0) * 100) / 100,
      visit_minutes: all.reduce((a, x) => a + x.visit_minutes, 0),
      travel_minutes: all.reduce((a, x) => a + x.travel_minutes, 0),
    },
    warnings,
    unplaced,
  };
}
