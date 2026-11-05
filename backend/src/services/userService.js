// İŞ KATMANI: kullanıcı kuralları (doğrulama, e-posta tekilliği, şifre özetleme)
import * as userRepository from '../repositories/userRepository.js';
import * as interestRepository from '../repositories/interestRepository.js';
import { hashPassword } from '../utils/password.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import { BUDGETS, PACES, toId, requiredString, optionalString, pagination } from '../utils/validate.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmail(value, required) {
  const email = required ? requiredString(value, 'E-posta', 255) : optionalString(value, 'E-posta', 255);
  if (email === undefined) return undefined;
  const lower = email.toLowerCase();
  if (!EMAIL_RE.test(lower)) throw new ValidationError('Geçersiz e-posta');
  return lower;
}

function parsePreferences(p) {
  if (p === undefined) return undefined;
  const budget = p.budget ?? 'orta';
  const pace = p.pace ?? 'normal';
  if (!BUDGETS.includes(budget)) throw new ValidationError(`Bütçe şunlardan biri olmalı: ${BUDGETS.join(', ')}`);
  if (!PACES.includes(pace)) throw new ValidationError(`Tempo şunlardan biri olmalı: ${PACES.join(', ')}`);
  return { budget, pace, language: p.language ?? 'tr' };
}

async function parseInterests(list) {
  if (list === undefined) return undefined;
  if (!Array.isArray(list)) throw new ValidationError('interests bir dizi olmalı');
  const valid = (await interestRepository.findAll()).map((i) => i.slug);
  const invalid = list.filter((s) => !valid.includes(s));
  if (invalid.length) throw new ValidationError(`Geçersiz ilgi alanı: ${invalid.join(', ')}`);
  return [...new Set(list)];
}

export async function createUser(body) {
  const fullName = requiredString(body.fullName, 'Ad soyad', 100);
  const email = parseEmail(body.email, true);
  const password = String(body.password || '');
  if (password.length < 8) throw new ValidationError('Şifre en az 8 karakter olmalı');
  if (await userRepository.existsByEmail(email)) throw new ConflictError('Bu e-posta zaten kayıtlı');

  return userRepository.create({
    fullName,
    email,
    passwordHash: hashPassword(password),
    preferences: parsePreferences(body.preferences) ?? {},
    interestSlugs: (await parseInterests(body.interests)) ?? [],
  });
}

export async function getUser(rawId) {
  const user = await userRepository.findById(toId(rawId, 'kullanıcı kimliği'));
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  return user;
}

export async function listUsers(query) {
  return userRepository.findAll(pagination(query));
}

export async function updateUser(rawId, body) {
  const id = toId(rawId, 'kullanıcı kimliği');
  const user = await userRepository.update(id, {
    fullName: optionalString(body.fullName, 'Ad soyad', 100),
    email: parseEmail(body.email, false),
    preferences: parsePreferences(body.preferences),
    interestSlugs: await parseInterests(body.interests),
  });
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  return user;
}

export async function deleteUser(rawId) {
  const ok = await userRepository.remove(toId(rawId, 'kullanıcı kimliği'));
  if (!ok) throw new NotFoundError('Kullanıcı bulunamadı');
}
