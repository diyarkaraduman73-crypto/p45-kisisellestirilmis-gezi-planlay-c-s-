// BİRİM TESTİ: ortak doğrulama yardımcıları (Hafta 8'de düzeltilen tarih hatası dahil)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optionalDate, toId, requiredString } from '../../src/utils/validate.js';

test('optionalDate: geçerli tarih aynen döner, boş değer undefined', () => {
  assert.equal(optionalDate('2026-11-26'), '2026-11-26');
  assert.equal(optionalDate('2028-02-29'), '2028-02-29'); // artık yıl
  assert.equal(optionalDate(undefined), undefined);
  assert.equal(optionalDate(''), undefined);
});

test('optionalDate: takvimde olmayan tarih 400 (önceden veritabanına gidip 500 veriyordu)', () => {
  for (const bad of ['2026-02-30', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10']) {
    assert.throws(() => optionalDate(bad), (e) => e.status === 400, bad);
  }
});

test('optionalDate: yanlış biçim ve metin olmayan değer reddedilir', () => {
  for (const bad of ['26.11.2026', '2026-1-5', 20261126, { y: 2026 }]) {
    assert.throws(() => optionalDate(bad), (e) => e.status === 400);
  }
});

test('toId ve requiredString', () => {
  assert.equal(toId('12'), 12);
  assert.throws(() => toId('abc'), (e) => e.status === 400);
  assert.throws(() => toId(0), (e) => e.status === 400);
  assert.equal(requiredString('  Gezi  ', 'Başlık', 10), 'Gezi');
  assert.throws(() => requiredString('   ', 'Başlık', 10), (e) => e.status === 400);
});
