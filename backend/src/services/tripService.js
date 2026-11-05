// İŞ KATMANI: rota kuralları
import { randomBytes } from 'node:crypto';
import * as tripRepository from '../repositories/tripRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as cityRepository from '../repositories/cityRepository.js';
import * as poiRepository from '../repositories/poiRepository.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { isAdmin, assertSelfOrAdmin } from './userService.js';
import { toId, requiredString, optionalString, optionalDate } from '../utils/validate.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// days: [{ dayNumber, summary?, items: [{ poiId, startTime?, note? }] }]
async function parseDays(days, dayCount) {
  if (days === undefined) return undefined;
  if (!Array.isArray(days)) throw new ValidationError('days bir dizi olmalı');
  const seen = new Set();
  const poiIds = new Set();

  const parsed = days.map((d) => {
    const dayNumber = Number(d.dayNumber);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > dayCount) {
      throw new ValidationError(`Gün numarası 1 ile ${dayCount} arasında olmalı`);
    }
    if (seen.has(dayNumber)) throw new ValidationError(`${dayNumber}. gün birden fazla kez verilmiş`);
    seen.add(dayNumber);
    const items = (d.items || []).map((it) => {
      const poiId = toId(it.poiId, 'POI kimliği');
      if (it.startTime && !TIME_RE.test(it.startTime)) throw new ValidationError('Saat SS:DD biçiminde olmalı');
      poiIds.add(poiId);
      return { poiId, startTime: it.startTime, note: it.note };
    });
    return { dayNumber, summary: d.summary, items };
  });

  if (poiIds.size && (await poiRepository.countActive([...poiIds])) !== poiIds.size) {
    throw new ValidationError('Planda var olmayan veya pasif bir POI kullanılmış'); // POI modülü K7
  }
  return parsed;
}

// Rota sahibi değilse ve yönetici değilse erişemez
async function loadOwned(actor, rawId) {
  const trip = await tripRepository.findById(toId(rawId, 'rota kimliği'));
  if (!trip) throw new NotFoundError('Rota bulunamadı');
  if (trip.user_id !== actor.id && !isAdmin(actor)) throw new ForbiddenError('Bu rota size ait değil');
  return trip;
}

// Rota her zaman giriş yapan kullanıcı adına oluşturulur (gövdedeki userId'ye güvenilmez).
// Yalnızca yönetici başka bir kullanıcı adına rota oluşturabilir.
export async function createTrip(actor, body) {
  let userId = actor.id;
  if (body.userId !== undefined && isAdmin(actor)) {
    userId = toId(body.userId, 'kullanıcı kimliği');
    if (!(await userRepository.findById(userId))) throw new NotFoundError('Kullanıcı bulunamadı');
  }

  const city = await cityRepository.findByName(requiredString(body.city, 'Şehir', 80));
  if (!city) throw new ValidationError('Şehir bulunamadı');

  const dayCount = Number(body.dayCount);
  if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 14) {
    throw new ValidationError('Gün sayısı 1 ile 14 arasında olmalı');
  }

  return tripRepository.create({
    userId,
    cityId: city.id,
    title: requiredString(body.title, 'Başlık', 120),
    startDate: optionalDate(body.startDate, 'Başlangıç tarihi'),
    dayCount,
    shareCode: randomBytes(9).toString('base64url'), // tahmin edilemeyen paylaşım kodu
    days: (await parseDays(body.days, dayCount)) ?? [],
  });
}

export async function getTrip(actor, rawId) {
  return loadOwned(actor, rawId);
}

// Paylaşım bağlantısı herkese açık: kodu bilen görüntüleyebilir (yalnızca okuma)
export async function getTripByShareCode(code) {
  const trip = await tripRepository.findByShareCode(String(code));
  if (!trip) throw new NotFoundError('Rota bulunamadı');
  const { user_id, ...publicTrip } = trip; // sahibin kimliği paylaşılmaz
  return publicTrip;
}

export async function listUserTrips(actor, rawUserId) {
  const userId = toId(rawUserId, 'kullanıcı kimliği');
  assertSelfOrAdmin(actor, userId);
  return tripRepository.findByUser(userId);
}

export async function updateTrip(actor, rawId, body) {
  const current = await loadOwned(actor, rawId);
  return tripRepository.update(current.id, {
    title: optionalString(body.title, 'Başlık', 120),
    startDate: optionalDate(body.startDate, 'Başlangıç tarihi'),
    days: await parseDays(body.days, current.day_count),
  });
}

export async function deleteTrip(actor, rawId) {
  const trip = await loadOwned(actor, rawId);
  await tripRepository.remove(trip.id);
}
