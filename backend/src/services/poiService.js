// İŞ KATMANI: POI doğrulama ve kuralları. HTTP'yi de SQL'i de bilmez.
import * as poiRepository from '../repositories/poiRepository.js';
import * as interestRepository from '../repositories/interestRepository.js';
import * as cityRepository from '../repositories/cityRepository.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import { toId, requiredString, optionalString } from '../utils/validate.js';

export { ValidationError, NotFoundError };

async function assertInterest(slug) {
  const valid = (await interestRepository.findAll()).map((i) => i.slug);
  if (!valid.includes(slug)) throw new ValidationError(`Geçersiz ilgi alanı: ${slug}`);
}

function parseNumber(value, label, min, max) {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new ValidationError(`${label} ${min} ile ${max} arasında olmalı`);
  return n;
}

export async function listInterests() {
  return interestRepository.findAll();
}

export async function listCities() {
  return cityRepository.findAll();
}

export async function listPois({ city, interests, search }) {
  const slugs = interests ? String(interests).split(',').map((s) => s.trim()).filter(Boolean) : [];
  if (slugs.length) {
    const valid = (await interestRepository.findAll()).map((i) => i.slug);
    const invalid = slugs.filter((s) => !valid.includes(s));
    if (invalid.length) throw new ValidationError(`Geçersiz ilgi alanı: ${invalid.join(', ')}`);
  }
  return poiRepository.findMany({
    city: city?.trim() || undefined,
    interests: slugs,
    search: search?.trim() || undefined,
  });
}

export async function getPoi(rawId) {
  const poi = await poiRepository.findById(toId(rawId, 'POI kimliği'));
  if (!poi) throw new NotFoundError('POI bulunamadı');
  return poi;
}

export async function createPoi(body) {
  const city = requiredString(body.city, 'Şehir', 80);
  if (!(await cityRepository.findByName(city))) throw new ValidationError('Şehir bulunamadı');
  const interest = requiredString(body.interest, 'İlgi alanı', 30);
  await assertInterest(interest);
  const lat = parseNumber(body.lat, 'Enlem', -90, 90);
  const lng = parseNumber(body.lng, 'Boylam', -180, 180);
  if (lat === undefined || lng === undefined) throw new ValidationError('Enlem ve boylam zorunludur');

  return poiRepository.create({
    city,
    interest,
    name: requiredString(body.name, 'Ad', 120),
    description: optionalString(body.description, 'Açıklama', 1000),
    lat,
    lng,
    visitMinutes: parseNumber(body.visitMinutes, 'Ziyaret süresi', 5, 600),
    priceLevel: parseNumber(body.priceLevel, 'Fiyat seviyesi', 0, 3),
  });
}

export async function updatePoi(rawId, body) {
  if (body.interest !== undefined) await assertInterest(body.interest);
  const poi = await poiRepository.update(toId(rawId, 'POI kimliği'), {
    name: optionalString(body.name, 'Ad', 120),
    description: optionalString(body.description, 'Açıklama', 1000),
    visitMinutes: parseNumber(body.visitMinutes, 'Ziyaret süresi', 5, 600),
    priceLevel: parseNumber(body.priceLevel, 'Fiyat seviyesi', 0, 3),
    interest: body.interest,
  });
  if (!poi) throw new NotFoundError('POI bulunamadı');
  return poi;
}

export async function deletePoi(rawId) {
  try {
    const ok = await poiRepository.remove(toId(rawId, 'POI kimliği'));
    if (!ok) throw new NotFoundError('POI bulunamadı');
  } catch (err) {
    if (err.code === '23503') throw new ConflictError('Bu POI bir gezi planında kullanıldığı için silinemez');
    throw err;
  }
}
