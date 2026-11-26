import { ValidationError } from './errors.js';

export const BUDGETS = ['dusuk', 'orta', 'yuksek'];
export const PACES = ['sakin', 'normal', 'yogun'];
export const ROLES = ['gezgin', 'yonetici'];

export function toId(value, label = 'Kimlik') {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new ValidationError(`Geçersiz ${label}`);
  return id;
}

export function optionalString(value, label, max) {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (!s) throw new ValidationError(`${label} boş olamaz`);
  if (s.length > max) throw new ValidationError(`${label} en fazla ${max} karakter olabilir`);
  return s;
}

export function requiredString(value, label, max) {
  const s = optionalString(value, label, max);
  if (s === undefined) throw new ValidationError(`${label} zorunludur`);
  return s;
}

export function optionalDate(value, label = 'Tarih') {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${label} YYYY-AA-GG biçiminde olmalı`);
  }
  // Hafta 8 düzeltmesi: Date.parse('2026-02-30') geçerli sayıp 2 Mart'a çeviriyordu;
  // değer veritabanına ulaşınca PostgreSQL reddediyor ve kullanıcı "Sunucu hatası" (500) görüyordu.
  // Tarihi gerçekten var mı diye geri dönüştürerek kontrol ediyoruz.
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${label} geçerli bir takvim tarihi değil`);
  }
  return value;
}

export function pagination(query) {
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}
