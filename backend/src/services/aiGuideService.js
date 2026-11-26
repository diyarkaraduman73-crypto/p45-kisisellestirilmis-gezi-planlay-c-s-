// İŞ KATMANI: Yapay Zekâ Bileşeni — Kişisel Plan ve Öneri Üretimi (Hafta 10)
//
// İş kuralları:
//  Y1  Rehber yalnızca rota sahibi (veya yönetici) tarafından üretilir; ROTA SAHİBİNİN profili kullanılır
//  Y2  Yapay zekâ planın saatlerini/sırasını değiştiremez; yalnızca anlatır ve katalogdan öneri seçer
//  Y3  Öneriler yalnızca katalogdaki AKTİF, ilgi alanına uyan ve planda OLMAYAN yerlerden; en fazla 3
//  Y4  Her çıktı doğrulanır (guideValidator D1–D8); geçmezse şablon kullanılır, kullanıcıya söylenir
//  Y5  Kişisel veri modele gönderilmez (ad, e-posta, başlangıç/otel konumu yok)
//  Y6  Kullanıcı başına 10 dakikada en fazla 5 üretim (maliyet/kota)
//  Y7  Her üretim ai_logs tablosuna yazılır (model, istem sürümü, durum, süre, sorunlar)
//  Y8  Rota planı değişince eski rehber silinir (tripRepository.update)
import * as tripRepository from '../repositories/tripRepository.js';
import * as poiRepository from '../repositories/poiRepository.js';
import * as aiLogRepository from '../repositories/aiLogRepository.js';
import { getTrip } from './tripService.js';
import { getProfile, scoreForProfile } from './profileService.js';
import { generateGuide } from './ai/guideEngine.js';
import { llm as defaultLlm } from './ai/llmClient.js';
import { ValidationError } from '../utils/errors.js';

export const MAX_CANDIDATES = 10;

// Kayıtlı rota + profil + katalog → istem bağlamı (yalnızca herkese açık mekân bilgileri ve tercih)
export function buildContext(trip, profile, catalog) {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const days = trip.days.map((d) => ({
    day_number: d.day_number,
    items: d.items.map((it) => {
      const p = byId.get(it.poi_id);
      return {
        poi_id: it.poi_id, name: it.name, start_time: it.start_time, end_time: it.end_time,
        travel_mode: it.travel_mode, visit_minutes: it.visit_minutes,
        district: p?.district ?? null, interest_name: p?.interest_name ?? it.interest ?? null,
      };
    }),
  }));
  const inPlan = new Set(days.flatMap((d) => d.items.map((i) => i.poi_id)));
  const interestSlugs = new Set(profile.interests.map((i) => i.slug));
  const candidates = scoreForProfile(profile, catalog.filter((p) => interestSlugs.has(p.interest) && !inPlan.has(p.id)))
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .slice(0, MAX_CANDIDATES)
    .map((p) => ({ id: p.id, name: p.name, district: p.district, interest_name: p.interest_name,
                   description: p.description, score: p.score, reasons: p.reasons }));
  return {
    city: trip.city, pace: trip.pace ?? profile.pace, budget: profile.budget,
    interests: profile.interests.map((i) => ({ name: i.name, weight: i.weight })), days, candidates,
  };
}

export async function createGuide(actor, rawTripId, { llm = defaultLlm } = {}) {
  const trip = await getTrip(actor, rawTripId);                            // Y1: sahiplik kontrolü
  if (!trip.days.some((d) => d.items.length)) throw new ValidationError('Rotada durak yok; önce plan üretin');
  const profile = await getProfile({ id: trip.user_id });                   // Y1: rota sahibinin profili
  const catalog = await poiRepository.findMany({ city: trip.city });        // Y3: yalnızca aktif POI'ler
  const ctx = buildContext(trip, profile, catalog);

  const { guide, log } = await generateGuide(ctx, { llm });
  await tripRepository.setGuide(trip.id, guide);
  try {
    await aiLogRepository.insert({ ...log, userId: actor.id, tripId: trip.id }); // Y7
  } catch (err) {
    console.error('[yapay-zeka] günlük yazılamadı:', err.message); // günlük hatası kullanıcıyı engellemez
  }
  return guide;
}

export const listLogs = (limit) => aiLogRepository.recent(Math.min(Math.max(Number(limit) || 50, 1), 200));
export const isConfigured = () => defaultLlm.isConfigured();
export const modelName = () => defaultLlm.model;
