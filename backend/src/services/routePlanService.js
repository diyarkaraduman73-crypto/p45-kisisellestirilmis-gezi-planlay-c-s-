// İŞ KATMANI: Rota ve Gün Planı Üretimi modülü
//
// İş kuralları (docs/moduller/rota-gun-plani.md):
//  R1  Üretilen rota 1–7 gün olabilir
//  R2  Gün penceresi 06:00–23:30 arasında ve en az 3 saat; hiçbir durak pencere dışına taşamaz
//  R3  Tempo günlük durak ve mesafe sınırını belirler (sakin 3/12 km, normal 5/20 km, yoğun 7/30 km);
//      verilmezse ilgi profilindeki tempo kullanılır; günlük km sınırı elle 1–100 arası verilebilir
//  R4  Bir POI bir rotada yalnızca bir kez yer alır
//  R5  Yalnızca aktif POI'ler; adaylar kullanıcının ilgi alanlarından gelir (profilde en az 1 ilgi gerekli)
//  R6  Başlangıç noktası verilirse şehrin hizmet alanı içinde olmalı
//  R7  En fazla 10 zorunlu yer; aktif ve aynı şehirde olmalı; sığmayanlar gerekçesiyle raporlanır
//  R8  Bir yer hem zorunlu hem hariç olamaz
//  R9  Kaydedilen plan istemciden alınmaz, sunucuda aynı parametrelerle YENİDEN üretilir
//      (istemci kısıtları atlatan bir plan gönderemez)
import { randomBytes } from 'node:crypto';
import * as poiRepository from '../repositories/poiRepository.js';
import * as cityRepository from '../repositories/cityRepository.js';
import * as tripRepository from '../repositories/tripRepository.js';
import { getProfile, scoreForProfile } from './profileService.js';
import { generatePlan, PACE, toMin } from './planner.js';
import { ValidationError } from '../utils/errors.js';
import { requiredString, optionalDate } from '../utils/validate.js';
import { distanceKm } from '../utils/geo.js';

export const MAX_DAYS = 7;
export const MAX_MUST = 10;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function idList(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError(`${label} bir dizi olmalı`);
  const ids = value.map(Number);
  if (ids.some((n) => !Number.isInteger(n) || n < 1)) throw new ValidationError(`${label} geçersiz kimlik içeriyor`);
  return [...new Set(ids)];
}

// Gelen istek → doğrulanmış plan parametreleri
export async function parseParams(body, profile) {
  const city = await cityRepository.findByName(String(body.city || 'İstanbul'));
  if (!city) throw new ValidationError('Şehir bulunamadı');

  const days = Number(body.days ?? 1);
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    throw new ValidationError(`Gün sayısı 1 ile ${MAX_DAYS} arasında olmalı`); // R1
  }

  const dayStart = body.dayStart ?? '09:00';
  const dayEnd = body.dayEnd ?? '19:00';
  if (!HHMM.test(dayStart) || !HHMM.test(dayEnd)) throw new ValidationError('Saatler SS:DD biçiminde olmalı');
  if (toMin(dayStart) < 6 * 60 || toMin(dayEnd) > 23 * 60 + 30) {
    throw new ValidationError('Gün 06:00\'dan önce başlayamaz, 23:30\'dan sonra bitemez'); // R2
  }
  if (toMin(dayEnd) - toMin(dayStart) < 180) throw new ValidationError('Gün penceresi en az 3 saat olmalı'); // R2

  const pace = body.pace ?? profile.pace ?? 'normal'; // R3
  if (!PACE[pace]) throw new ValidationError('Tempo sakin, normal veya yogun olmalı');

  let maxDailyKm;
  if (body.maxDailyKm !== undefined && body.maxDailyKm !== null && body.maxDailyKm !== '') {
    maxDailyKm = Number(body.maxDailyKm);
    if (!Number.isFinite(maxDailyKm) || maxDailyKm < 1 || maxDailyKm > 100) {
      throw new ValidationError('Günlük mesafe sınırı 1–100 km olmalı'); // R3
    }
  }

  let start = null;
  if (body.start) {
    const lat = Number(body.start.lat);
    const lng = Number(body.start.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new ValidationError('Başlangıç noktası geçersiz');
    const d = distanceKm(city.center_lat, city.center_lng, lat, lng);
    if (d > city.radius_km) {
      throw new ValidationError(`Başlangıç noktası ${city.name} merkezine ${d.toFixed(1)} km uzakta (en fazla ${city.radius_km} km)`); // R6
    }
    start = { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 };
  }

  const mustInclude = idList(body.mustInclude, 'mustInclude');
  const exclude = idList(body.exclude, 'exclude');
  if (mustInclude.length > MAX_MUST) throw new ValidationError(`En fazla ${MAX_MUST} zorunlu yer seçilebilir`); // R7
  const both = mustInclude.filter((id) => exclude.includes(id));
  if (both.length) throw new ValidationError(`Bir yer hem zorunlu hem hariç olamaz: ${both.join(', ')}`); // R8

  return { city, days, dayStart, dayEnd, pace, maxDailyKm, start, mustInclude, exclude,
           startDate: optionalDate(body.startDate, 'Başlangıç tarihi') };
}

// Aday POI'ler: ilgi alanlarındaki aktif POI'ler + zorunlu olanlar − hariç tutulanlar (puanlı)
async function candidatesFor(profile, params) {
  if (!profile.interests.length) {
    throw new ValidationError('Rota üretmek için önce ilgi profilinde en az bir ilgi alanı seç'); // R5
  }
  const list = await poiRepository.findMany({ city: params.city.name, interests: profile.interests.map((i) => i.slug) });
  const ids = new Set(list.map((p) => p.id));

  for (const id of params.mustInclude) {
    if (ids.has(id)) continue;
    const poi = await poiRepository.findById(id); // yalnızca aktif POI döner
    if (!poi) throw new ValidationError(`Zorunlu yer #${id} bulunamadı veya pasif`); // R5, R7
    if (poi.city !== params.city.name) throw new ValidationError(`"${poi.name}" ${params.city.name} şehrinde değil`); // R7
    list.push(poi);
  }
  const excluded = new Set(params.exclude);
  return scoreForProfile(profile, list.filter((p) => !excluded.has(p.id)));
}

const publicParams = (p) => ({
  city: p.city.name, days: p.days, pace: p.pace, dayStart: p.dayStart, dayEnd: p.dayEnd,
  maxDailyKm: p.maxDailyKm ?? PACE[p.pace].maxDailyKm, start: p.start,
  mustInclude: p.mustInclude, exclude: p.exclude, startDate: p.startDate ?? null,
});

// ÖNİZLEME: kaydetmeden plan üret
export async function previewPlan(actor, body = {}) {
  const profile = await getProfile(actor);
  const params = await parseParams(body, profile);
  const candidates = await candidatesFor(profile, params);
  const plan = generatePlan(candidates, params);
  return { params: publicParams(params), ...plan };
}

// ÜRET + KAYDET (R9: plan sunucuda yeniden üretilir, istemcinin gönderdiği gün listesi kullanılmaz)
export async function generateAndSave(actor, body = {}) {
  const title = requiredString(body.title, 'Başlık', 120);
  const profile = await getProfile(actor);
  const params = await parseParams(body, profile);
  const plan = generatePlan(await candidatesFor(profile, params), params);
  if (plan.totals.stops === 0) throw new ValidationError('Bu ayarlarla hiç durak üretilemedi; kaydedilecek bir plan yok');

  const trip = await tripRepository.create({
    userId: actor.id,
    cityId: params.city.id,
    title,
    startDate: params.startDate,
    dayCount: params.days,
    shareCode: randomBytes(9).toString('base64url'),
    gen: { pace: params.pace, dayStart: params.dayStart, dayEnd: params.dayEnd, start: params.start },
    days: plan.days.map((d) => ({
      dayNumber: d.day_number,
      summary: d.summary,
      items: d.items.map((it) => ({
        poiId: it.poi_id, startTime: it.start_time, endTime: it.end_time,
        travelMinutes: it.travel_minutes, travelKm: it.travel_km, travelMode: it.travel_mode,
      })),
    })),
  });
  return { trip, warnings: plan.warnings, unplaced: plan.unplaced, totals: plan.totals };
}
