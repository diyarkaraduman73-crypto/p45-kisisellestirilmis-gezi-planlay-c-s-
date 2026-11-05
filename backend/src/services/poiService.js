// İŞ KATMANI: POI Kataloğu modülü — doğrulama ve iş kuralları.
//
// İş kuralları (docs/moduller/poi-katalogu.md):
//  K1  Ad 2–120 karakter; aynı şehirde aynı adlı ikinci POI olamaz (büyük/küçük harf duyarsız)
//  K2  Kategori (ilgi alanı) zorunlu ve geçerli olmalı; her POI'nin tek ana kategorisi vardır
//  K3  Etiketler isteğe bağlı, en fazla 6, var olan etiketlerden seçilir, tekrarlar atılır
//  K4  Koordinat geçerli aralıkta olmalı VE şehrin merkezine şehrin hizmet yarıçapından uzak olmamalı
//  K5  Ziyaret süresi 5–600 dk ve 5'in katı; fiyat seviyesi 0–3
//  K6  Gezi planında kullanılan POI silinmez, pasifleştirilir (geçmiş planlar bozulmasın)
//  K7  Pasif POI'ler herkese açık listelerde görünmez ve yeni planlara eklenemez
//  K8  Yakınlık aramasında yarıçap 0.1–50 km
import * as poiRepository from '../repositories/poiRepository.js';
import * as interestRepository from '../repositories/interestRepository.js';
import * as cityRepository from '../repositories/cityRepository.js';
import * as tagRepository from '../repositories/tagRepository.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import { toId, requiredString, optionalString } from '../utils/validate.js';
import { distanceKm } from '../utils/geo.js';

export { ValidationError, NotFoundError };

export const MAX_TAGS = 6;
const isAdmin = (actor) => actor?.role === 'yonetici';

function num(value, label, min, max, { integer = false, step } = {}) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new ValidationError(`${label} ${min} ile ${max} arasında olmalı`);
  if (integer && !Number.isInteger(n)) throw new ValidationError(`${label} tam sayı olmalı`);
  if (step && n % step !== 0) throw new ValidationError(`${label} ${step}'in katı olmalı`);
  return n;
}

const csv = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

async function interestBySlug(slug) {
  const list = await interestRepository.findAll();
  const found = list.find((i) => i.slug === slug);
  if (!found) throw new ValidationError(`Geçersiz kategori: ${slug}`); // K2
  return found;
}

async function parseTags(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ValidationError('tags bir dizi olmalı');
  const slugs = [...new Set(value.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
  if (slugs.length > MAX_TAGS) throw new ValidationError(`En fazla ${MAX_TAGS} etiket eklenebilir`); // K3
  if (slugs.length) {
    const found = await tagRepository.findSlugs(slugs);
    const missing = slugs.filter((s) => !found.includes(s));
    if (missing.length) throw new ValidationError(`Tanımlı olmayan etiket: ${missing.join(', ')}`);
  }
  return slugs;
}

// K4: koordinat şehrin hizmet alanında mı?
function assertInCity(city, lat, lng) {
  if (city.center_lat == null) return;
  const d = distanceKm(city.center_lat, city.center_lng, lat, lng);
  if (d > city.radius_km) {
    throw new ValidationError(
      `Konum ${city.name} merkezine ${d.toFixed(1)} km uzakta; en fazla ${city.radius_km} km olabilir`
    );
  }
}

function parseNear(q) {
  if (q.lat === undefined && q.lng === undefined) return undefined;
  const lat = num(q.lat, 'Enlem', -90, 90);
  const lng = num(q.lng, 'Boylam', -180, 180);
  if (lat === undefined || lng === undefined) throw new ValidationError('Yakınlık araması için lat ve lng birlikte verilmeli');
  const radiusKm = num(q.radiusKm ?? 3, 'Yarıçap', 0.1, 50); // K8
  return { lat, lng, radiusKm };
}

// ---------- Okuma ----------

export const listInterests = () => interestRepository.findAll();
export const listCities = () => cityRepository.findAll();

export async function listPois(query = {}, actor = null) {
  const interests = csv(query.interests);
  if (interests.length) {
    const valid = (await interestRepository.findAll()).map((i) => i.slug);
    const invalid = interests.filter((s) => !valid.includes(s));
    if (invalid.length) throw new ValidationError(`Geçersiz ilgi alanı: ${invalid.join(', ')}`);
  }
  return poiRepository.findMany({
    city: query.city?.trim() || undefined,
    interests,
    tags: csv(query.tags),
    search: query.q?.trim() || undefined,
    priceMax: num(query.priceMax, 'En yüksek fiyat', 0, 3, { integer: true }),
    near: parseNear(query),
    includeInactive: isAdmin(actor) && query.includeInactive === '1', // K7
  });
}

export async function getPoi(rawId, actor = null) {
  const poi = await poiRepository.findById(toId(rawId, 'POI kimliği'), { includeInactive: isAdmin(actor) });
  if (!poi) throw new NotFoundError('POI bulunamadı');
  return poi;
}

// ---------- Yazma (yalnızca yönetici; route'ta requireRole) ----------

export async function createPoi(body, actor) {
  const city = await cityRepository.findByName(requiredString(body.city, 'Şehir', 80));
  if (!city) throw new ValidationError('Şehir bulunamadı');
  const name = requiredString(body.name, 'Ad', 120);
  if (name.length < 2) throw new ValidationError('Ad en az 2 karakter olmalı'); // K1
  const interest = await interestBySlug(requiredString(body.interest, 'Kategori', 30));

  const lat = num(body.lat, 'Enlem', -90, 90);
  const lng = num(body.lng, 'Boylam', -180, 180);
  if (lat === undefined || lng === undefined) throw new ValidationError('Enlem ve boylam zorunludur');
  assertInCity(city, lat, lng);

  if (await poiRepository.existsByCityAndName(city.id, name)) {
    throw new ConflictError(`${city.name} şehrinde "${name}" adlı bir POI zaten var`); // K1
  }

  return poiRepository.create({
    cityId: city.id,
    interestId: interest.id,
    name,
    description: optionalString(body.description, 'Açıklama', 1000),
    district: optionalString(body.district, 'İlçe', 80),
    address: optionalString(body.address, 'Adres', 200),
    lat,
    lng,
    visitMinutes: num(body.visitMinutes, 'Ziyaret süresi', 5, 600, { integer: true, step: 5 }) ?? 60, // K5
    priceLevel: num(body.priceLevel, 'Fiyat seviyesi', 0, 3, { integer: true }) ?? 0,
    tags: (await parseTags(body.tags)) ?? [],
    createdBy: actor?.id,
  });
}

export async function updatePoi(rawId, body) {
  const id = toId(rawId, 'POI kimliği');
  const current = await poiRepository.findById(id, { includeInactive: true });
  if (!current) throw new NotFoundError('POI bulunamadı');
  const city = await cityRepository.findByName(current.city);

  const name = optionalString(body.name, 'Ad', 120);
  if (name !== undefined) {
    if (name.length < 2) throw new ValidationError('Ad en az 2 karakter olmalı');
    if (await poiRepository.existsByCityAndName(city.id, name, id)) {
      throw new ConflictError(`${city.name} şehrinde "${name}" adlı bir POI zaten var`);
    }
  }

  const lat = num(body.lat, 'Enlem', -90, 90);
  const lng = num(body.lng, 'Boylam', -180, 180);
  if (lat !== undefined || lng !== undefined) assertInCity(city, lat ?? current.lat, lng ?? current.lng);

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    throw new ValidationError('isActive true veya false olmalı');
  }

  return poiRepository.update(id, {
    name,
    description: optionalString(body.description, 'Açıklama', 1000),
    district: optionalString(body.district, 'İlçe', 80),
    address: optionalString(body.address, 'Adres', 200),
    lat,
    lng,
    visitMinutes: num(body.visitMinutes, 'Ziyaret süresi', 5, 600, { integer: true, step: 5 }),
    priceLevel: num(body.priceLevel, 'Fiyat seviyesi', 0, 3, { integer: true }),
    interestId: body.interest !== undefined ? (await interestBySlug(body.interest)).id : undefined,
    isActive: body.isActive,
    tags: await parseTags(body.tags),
  });
}

// K6: kullanılıyorsa pasifleştir, kullanılmıyorsa kalıcı sil
export async function deletePoi(rawId) {
  const id = toId(rawId, 'POI kimliği');
  const current = await poiRepository.findById(id, { includeInactive: true });
  if (!current) throw new NotFoundError('POI bulunamadı');
  const used = await poiRepository.usageCount(id);
  if (used > 0) {
    await poiRepository.update(id, { isActive: false });
    return { deleted: false, deactivated: true, usedInPlans: used };
  }
  await poiRepository.remove(id);
  return { deleted: true, deactivated: false, usedInPlans: 0 };
}
