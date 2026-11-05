// İŞ KATMANI: Etiketler
import * as tagRepository from '../repositories/tagRepository.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import { requiredString } from '../utils/validate.js';

const TR = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u' };

// "Gün Batımı" → "gun-batimi"
export function slugify(text) {
  return String(text)
    .toLocaleLowerCase('tr')
    .replace(/[çğıiöşü]/g, (c) => TR[c])
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const listTags = () => tagRepository.findAll();

export async function createTag(body) {
  const name = requiredString(body.name, 'Etiket adı', 60);
  const slug = slugify(body.slug ?? name);
  if (slug.length < 2 || slug.length > 40) throw new ValidationError('Etiket kısaltması 2–40 karakter olmalı');
  if ((await tagRepository.findSlugs([slug])).length) throw new ConflictError(`"${slug}" etiketi zaten var`);
  return tagRepository.create(slug, name);
}

export async function deleteTag(slug) {
  if (!(await tagRepository.removeBySlug(String(slug)))) throw new NotFoundError('Etiket bulunamadı');
}
