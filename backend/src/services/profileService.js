// İŞ KATMANI: İlgi Profili modülü
//
// İş kuralları:
//  P1  Profil yalnızca sahibine aittir (giriş yapan kullanıcı; /api/profile → "me")
//  P2  En az 1 ilgi alanı seçilmeli; her ilgi alanı en fazla bir kez
//  P3  İlgi düzeyi (ağırlık) 1–5 arası tam sayı; verilmezse 3
//  P4  Bütçe: dusuk | orta | yuksek; tempo: sakin | normal | yogun
//  P5  Önerilerde bütçeyi aşan POI'ler elenmez ama puanı düşer ve gerekçesi yazılır
import * as userRepository from '../repositories/userRepository.js';
import * as interestRepository from '../repositories/interestRepository.js';
import * as poiRepository from '../repositories/poiRepository.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { BUDGETS, PACES } from '../utils/validate.js';

// Bütçeye göre "rahatça" gidilebilecek en yüksek fiyat seviyesi
export const BUDGET_MAX_PRICE = { dusuk: 1, orta: 2, yuksek: 3 };

function toProfile(user, interestList) {
  const weights = user.interest_weights || {};
  return {
    userId: user.id,
    budget: user.budget,
    pace: user.pace,
    interests: interestList
      .filter((i) => weights[i.slug] !== undefined)
      .map((i) => ({ slug: i.slug, name: i.name, weight: weights[i.slug] }))
      .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'tr')),
  };
}

export async function getProfile(actor) {
  const user = await userRepository.findById(actor.id);
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  return toProfile(user, await interestRepository.findAll());
}

// PUT: profil bütünüyle değiştirilir
export async function updateProfile(actor, body = {}) {
  const all = await interestRepository.findAll();
  const valid = all.map((i) => i.slug);

  if (!Array.isArray(body.interests) || body.interests.length === 0) {
    throw new ValidationError('En az bir ilgi alanı seçmelisiniz'); // P2
  }
  const seen = new Set();
  const interests = body.interests.map((x) => {
    const slug = typeof x === 'string' ? x : x?.slug;
    const weight = typeof x === 'string' || x?.weight === undefined ? 3 : Number(x.weight);
    if (!valid.includes(slug)) throw new ValidationError(`Geçersiz ilgi alanı: ${slug}`);
    if (seen.has(slug)) throw new ValidationError(`"${slug}" birden fazla kez verilmiş`); // P2
    if (!Number.isInteger(weight) || weight < 1 || weight > 5) {
      throw new ValidationError('İlgi düzeyi 1 ile 5 arasında tam sayı olmalı'); // P3
    }
    seen.add(slug);
    return { slug, weight };
  });

  const budget = body.budget ?? 'orta';
  const pace = body.pace ?? 'normal';
  if (!BUDGETS.includes(budget)) throw new ValidationError(`Bütçe şunlardan biri olmalı: ${BUDGETS.join(', ')}`); // P4
  if (!PACES.includes(pace)) throw new ValidationError(`Tempo şunlardan biri olmalı: ${PACES.join(', ')}`);

  const user = await userRepository.update(actor.id, { preferences: { budget, pace }, interestSlugs: interests });
  return toProfile(user, all);
}

// ENTEGRASYON: profil + katalog → kişiye göre sıralanmış POI listesi.
// Puan (0–100): ilgi düzeyi × 20, bütçeyi aşıyorsa −30, konum verildiyse uzaklık başına −2 (en fazla −20).
export async function recommendPois(actor, query = {}) {
  const profile = await getProfile(actor);
  if (!profile.interests.length) {
    throw new ValidationError('Öneri için önce profilinizde en az bir ilgi alanı seçin');
  }
  const weightOf = Object.fromEntries(profile.interests.map((i) => [i.slug, i]));
  const maxPrice = BUDGET_MAX_PRICE[profile.budget];

  const lat = query.lat !== undefined ? Number(query.lat) : undefined;
  const lng = query.lng !== undefined ? Number(query.lng) : undefined;
  const near = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, radiusKm: 50 } : undefined;

  const pois = await poiRepository.findMany({
    city: query.city || 'İstanbul',
    interests: Object.keys(weightOf),
    near,
  });

  return pois
    .map((p) => {
      const interest = weightOf[p.interest];
      const reasons = [`${interest.name} ilgin: ${interest.weight}/5`];
      let score = interest.weight * 20;
      if (p.price_level > maxPrice) {
        score -= 30;
        reasons.push('bütçenin üstünde');
      } else {
        reasons.push('bütçene uygun');
      }
      if (p.distance_km !== undefined) {
        score -= Math.min(20, Math.round(p.distance_km * 2));
        reasons.push(`${p.distance_km} km uzakta`);
      }
      return { ...p, score: Math.max(0, score), reasons };
    })
    .sort((a, b) => b.score - a.score || (a.distance_km ?? 0) - (b.distance_km ?? 0) || a.name.localeCompare(b.name, 'tr'))
    .slice(0, Math.min(Number(query.limit) || 20, 50));
}
