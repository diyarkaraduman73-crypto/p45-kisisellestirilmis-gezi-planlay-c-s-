// İŞ KATMANI: rota kuralları
import { randomBytes } from 'node:crypto';
import * as tripRepository from '../repositories/tripRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as cityRepository from '../repositories/cityRepository.js';
import * as poiRepository from '../repositories/poiRepository.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
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

  if (poiIds.size && (await poiRepository.countExisting([...poiIds])) !== poiIds.size) {
    throw new ValidationError('Planda var olmayan bir POI kullanılmış');
  }
  return parsed;
}

export async function createTrip(body) {
  const userId = toId(body.userId, 'kullanıcı kimliği');
  if (!(await userRepository.findById(userId))) throw new NotFoundError('Kullanıcı bulunamadı');

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
    shareCode: randomBytes(6).toString('base64url'), // paylaşım bağlantısı için
    days: (await parseDays(body.days, dayCount)) ?? [],
  });
}

export async function getTrip(rawId) {
  const trip = await tripRepository.findById(toId(rawId, 'rota kimliği'));
  if (!trip) throw new NotFoundError('Rota bulunamadı');
  return trip;
}

export async function getTripByShareCode(code) {
  const trip = await tripRepository.findByShareCode(String(code));
  if (!trip) throw new NotFoundError('Rota bulunamadı');
  return trip;
}

export async function listUserTrips(rawUserId) {
  return tripRepository.findByUser(toId(rawUserId, 'kullanıcı kimliği'));
}

export async function updateTrip(rawId, body) {
  const id = toId(rawId, 'rota kimliği');
  const current = await tripRepository.findById(id);
  if (!current) throw new NotFoundError('Rota bulunamadı');
  return tripRepository.update(id, {
    title: optionalString(body.title, 'Başlık', 120),
    startDate: optionalDate(body.startDate, 'Başlangıç tarihi'),
    days: await parseDays(body.days, current.day_count),
  });
}

export async function deleteTrip(rawId) {
  const ok = await tripRepository.remove(toId(rawId, 'rota kimliği'));
  if (!ok) throw new NotFoundError('Rota bulunamadı');
}
