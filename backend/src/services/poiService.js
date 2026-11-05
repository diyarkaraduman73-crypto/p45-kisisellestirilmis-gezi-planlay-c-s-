// İŞ KATMANI: doğrulama ve iş kuralları. HTTP'yi de SQL'i de bilmez.
import * as poiRepository from '../repositories/poiRepository.js';
import * as interestRepository from '../repositories/interestRepository.js';

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
  }
}

export async function listInterests() {
  return interestRepository.findAll();
}

export async function listPois({ city, interests }) {
  const slugs = interests ? String(interests).split(',').map((s) => s.trim()).filter(Boolean) : [];
  if (slugs.length) {
    const valid = (await interestRepository.findAll()).map((i) => i.slug);
    const invalid = slugs.filter((s) => !valid.includes(s));
    if (invalid.length) throw new ValidationError(`Geçersiz ilgi alanı: ${invalid.join(', ')}`);
  }
  return poiRepository.findMany({ city: city?.trim() || undefined, interests: slugs });
}

export async function getPoi(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) throw new ValidationError('Geçersiz POI kimliği');
  const poi = await poiRepository.findById(id);
  if (!poi) throw new NotFoundError('POI bulunamadı');
  return poi;
}
