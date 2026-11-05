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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`${label} YYYY-AA-GG biçiminde olmalı`);
  }
  return value;
}

export function pagination(query) {
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}
