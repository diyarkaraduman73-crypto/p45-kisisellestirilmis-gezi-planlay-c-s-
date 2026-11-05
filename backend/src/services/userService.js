// İŞ KATMANI: kullanıcı kuralları (doğrulama, e-posta tekilliği, parola özetleme, yetki)
import * as userRepository from '../repositories/userRepository.js';
import * as interestRepository from '../repositories/interestRepository.js';
import { hashPassword, passwordProblem } from '../utils/password.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { BUDGETS, PACES, ROLES, toId, requiredString, optionalString, pagination } from '../utils/validate.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isAdmin = (actor) => actor?.role === 'yonetici';

// Yetki kuralı: kişi yalnızca kendi kaydını görebilir/değiştirebilir; yönetici herkesi.
export function assertSelfOrAdmin(actor, userId) {
  if (!actor) throw new ForbiddenError();
  if (actor.id !== userId && !isAdmin(actor)) throw new ForbiddenError('Başka bir kullanıcının bilgilerine erişemezsiniz');
}

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

// options.role yalnızca güvenilir çağıranlardan (kayıt servisi, yönetici) gelir
export async function createUser(body, { role = 'gezgin' } = {}) {
  if (!ROLES.includes(role)) throw new ValidationError('Geçersiz rol');
  const fullName = requiredString(body.fullName, 'Ad soyad', 100);
  const email = parseEmail(body.email, true);
  const problem = passwordProblem(body.password);
  if (problem) throw new ValidationError(problem);
  if (await userRepository.existsByEmail(email)) throw new ConflictError('Bu e-posta zaten kayıtlı');

  return userRepository.create({
    fullName,
    email,
    role,
    passwordHash: hashPassword(String(body.password)),
    preferences: parsePreferences(body.preferences) ?? {},
    interestSlugs: (await parseInterests(body.interests)) ?? [],
  });
}

// Yönetici panelinden kullanıcı ekleme (rol seçilebilir)
export async function createUserAsAdmin(body) {
  return createUser(body, { role: body.role ?? 'gezgin' });
}

export async function getUser(actor, rawId) {
  const id = toId(rawId, 'kullanıcı kimliği');
  assertSelfOrAdmin(actor, id);
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  return user;
}

export async function listUsers(query) {
  return userRepository.findAll(pagination(query));
}

export async function updateUser(actor, rawId, body) {
  const id = toId(rawId, 'kullanıcı kimliği');
  assertSelfOrAdmin(actor, id);
  if (body.role !== undefined) throw new ForbiddenError('Rol bu uçtan değiştirilemez');
  const email = parseEmail(body.email, false);
  if (email) {
    const current = await userRepository.findById(id);
    if (current && current.email !== email && (await userRepository.existsByEmail(email))) {
      throw new ConflictError('Bu e-posta zaten kayıtlı');
    }
  }
  const user = await userRepository.update(id, {
    fullName: optionalString(body.fullName, 'Ad soyad', 100),
    email,
    preferences: parsePreferences(body.preferences),
    interestSlugs: await parseInterests(body.interests),
  });
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  return user;
}

// Yalnızca yönetici çağırır (route seviyesinde requireRole). Son yöneticinin rolü düşürülemez.
export async function changeRole(actor, rawId, role) {
  const id = toId(rawId, 'kullanıcı kimliği');
  if (!ROLES.includes(role)) throw new ValidationError(`Rol şunlardan biri olmalı: ${ROLES.join(', ')}`);
  if (actor.id === id && role !== 'yonetici') {
    throw new ForbiddenError('Kendi yönetici yetkinizi kaldıramazsınız');
  }
  const user = await userRepository.updateRole(id, role);
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  return user;
}

export async function deleteUser(actor, rawId) {
  const id = toId(rawId, 'kullanıcı kimliği');
  assertSelfOrAdmin(actor, id);
  const target = await userRepository.findById(id);
  if (!target) throw new NotFoundError('Kullanıcı bulunamadı');
  if (target.role === 'yonetici' && (await userRepository.countByRole('yonetici')) <= 1) {
    throw new ForbiddenError('Sistemdeki son yönetici silinemez');
  }
  await userRepository.remove(id);
}
