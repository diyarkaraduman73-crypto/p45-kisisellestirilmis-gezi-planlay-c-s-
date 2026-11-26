// BİRİM TESTİ: Yapay Zekâ Bileşeni (Hafta 10) — gerçek modele gitmeden, sahte yanıtlarla
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGuidePrompt, PROMPT_VERSION } from '../../src/services/ai/guidePrompt.js';
import { validateGuide, extractJson, cleanText } from '../../src/services/ai/guideValidator.js';
import { buildFallbackGuide } from '../../src/services/ai/fallbackGuide.js';
import { generateGuide } from '../../src/services/ai/guideEngine.js';
import { createLlmClient } from '../../src/services/ai/llmClient.js';

// Örnek bağlam: 2 günlük plan (seed'deki gerçek POI'ler) + öneri adayları
const ctx = {
  city: 'İstanbul', pace: 'normal', budget: 'orta',
  interests: [{ name: 'Tarih & Müze', weight: 5 }, { name: 'Manzara', weight: 4 }],
  days: [
    { day_number: 1, items: [
      { poi_id: 1, name: 'Ayasofya', start_time: '09:00', end_time: '10:15', travel_mode: null, visit_minutes: 75, district: 'Fatih', interest_name: 'Tarih & Müze' },
      { poi_id: 4, name: 'Yerebatan Sarnıcı', start_time: '10:30', end_time: '11:15', travel_mode: 'yuruyus', visit_minutes: 45, district: 'Fatih', interest_name: 'Tarih & Müze' },
    ] },
    { day_number: 2, items: [
      { poi_id: 8, name: 'Galata Kulesi', start_time: '09:00', end_time: '10:00', travel_mode: null, visit_minutes: 60, district: 'Beyoğlu', interest_name: 'Manzara' },
    ] },
  ],
  candidates: [
    { id: 3, name: 'Topkapı Sarayı', district: 'Fatih', interest_name: 'Tarih & Müze', description: 'Osmanlı sarayı.', score: 100, reasons: ['Tarih & Müze ilgin: 5/5', 'bütçene uygun'] },
    { id: 12, name: 'Dolmabahçe Sarayı', district: 'Beşiktaş', interest_name: 'Tarih & Müze', description: 'Boğaz kıyısında saray.', score: 100, reasons: ['Tarih & Müze ilgin: 5/5'] },
    { id: 16, name: 'Rumeli Hisarı', district: 'Sarıyer', interest_name: 'Tarih & Müze', description: 'Hisar.', score: 100, reasons: ['Tarih & Müze ilgin: 5/5'] },
    { id: 7, name: 'Süleymaniye Camii', district: 'Fatih', interest_name: 'Dini Yapılar', description: 'Sinan.', score: 60, reasons: [] },
  ],
};
const fallback = buildFallbackGuide(ctx);

// Modelin "iyi" bir yanıtı
const GOOD = {
  genel_bakis: 'İki gün boyunca Bizans ve Osmanlı izlerini, ardından şehri yukarıdan göreceksin.',
  gunler: [
    { gun: 1, baslik: 'Tarihi Yarımada', ozet: 'Sabah Ayasofya ile başlayıp yürüyerek Yerebatan\'a geçiyorsun.', ipuclari: [{ poi_id: 1, ipucu: 'Üst galeriye çıkmayı unutma.' }, { poi_id: 4, ipucu: 'İçerisi serin, ince bir hırka al.' }] },
    { gun: 2, baslik: 'Galata\'dan manzara', ozet: 'Güne 09:00\'da Galata Kulesi\'nde başla.', ipuclari: [{ poi_id: 8, ipucu: 'Fotoğraf için sabah ışığı iyidir.' }] },
  ],
  oneriler: [{ poi_id: 3, neden: 'Tarih ilgin yüksek; Ayasofya\'ya çok yakın.' }],
};

// ---------- istem ----------

test('istem: kurallar ve şema var; kişisel veri yok; tüm POI kimlikleri var', () => {
  const p = buildGuidePrompt({ ...ctx, email: 'kisi@example.com', fullName: 'Deneme Kullanıcı', start: { lat: 41.01, lng: 28.95 } });
  assert.equal(p.version, PROMPT_VERSION);
  assert.match(p.system, /UYDURMA/);
  assert.match(p.system, /JSON/, 'Groq JSON modu istemde "JSON" kelimesini ister');
  assert.match(p.system, /İstanbul/);
  for (const bad of ['kisi@example.com', 'Deneme Kullanıcı', '28.95']) assert.ok(!(p.system + p.user).includes(bad), bad);
  for (const id of [1, 4, 8, 3, 12]) assert.match(p.user, new RegExp(`"poi_id": ${id}\\b`));
});

// ---------- model istemcisi ----------

test('llmClient: doğru uç, Bearer anahtar, JSON modu; yanıt ve kullanım ayrıştırılır', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { status: 200, ok: true, headers: { get: () => null },
      text: async () => JSON.stringify({ model: 'openai/gpt-oss-20b', choices: [{ message: { content: '{"a":1}' }, finish_reason: 'stop' }], usage: { prompt_tokens: 900, completion_tokens: 300 } }) };
  };
  const c = createLlmClient({ apiKey: 'gsk_test', fetchImpl });
  const r = await c.chatJson({ system: 'S', user: 'U' });
  assert.equal(calls[0].url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer gsk_test');
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.response_format, { type: 'json_object' });
  assert.equal(body.model, 'openai/gpt-oss-20b');
  assert.equal(body.reasoning_effort, 'low');
  assert.equal(r.content, '{"a":1}');
  assert.deepEqual(r.usage, { input: 900, output: 300 });
});

test('llmClient: anahtar yoksa servise gidilmez', async () => {
  let called = false;
  const c = createLlmClient({ apiKey: '', fetchImpl: async () => { called = true; } });
  assert.equal(c.isConfigured(), false);
  await assert.rejects(c.chatJson({ system: 'S', user: 'U' }), (e) => e.kind === 'anahtar');
  assert.equal(called, false);
});

// ---------- doğrulama ----------

test('D1: geçerli yanıt sorunsuz geçer; çitli/önsözlü JSON da ayıklanır', () => {
  const r = validateGuide(JSON.stringify(GOOD), ctx, fallback);
  assert.equal(r.valid, true);
  assert.deepEqual(r.issues, []);
  assert.equal(r.guide.gunler[0].ipuclari[0].ad, 'Ayasofya', 'ad bizim veriden eklenir');
  assert.equal(r.guide.oneriler[0].ad, 'Topkapı Sarayı');
  assert.deepEqual(extractJson('İşte rehber:\n```json\n{"x": 2}\n```\nİyi geziler!'), { x: 2 });
});

test('D1/D8: JSON olmayan veya boş yanıt geçersiz', () => {
  for (const raw of ['Üzgünüm, yardımcı olamam.', '{"genel_bakis": ', '[]', '{}', '']) {
    assert.equal(validateGuide(raw, ctx, fallback).valid, false, raw);
  }
});

test('D4: uydurma yer ve başka güne ait durak için ipucu atılır', () => {
  const bad = structuredClone(GOOD);
  bad.gunler[0].ipuclari.push({ poi_id: 999, ipucu: 'Hayali Kafe\'de mola ver.' }, { poi_id: 8, ipucu: 'Bu 2. günün durağı.' });
  const r = validateGuide(JSON.stringify(bad), ctx, fallback);
  assert.equal(r.valid, true);
  assert.deepEqual(r.guide.gunler[0].ipuclari.map((t) => t.poi_id), [1, 4]);
  assert.equal(r.issues.length, 2);
});

test('D5: öneri yalnızca adaylardan, planda olmayan, en fazla 3', () => {
  const bad = structuredClone(GOOD);
  bad.oneriler = [{ poi_id: 1, neden: 'zaten planda' }, { poi_id: 555, neden: 'uydurma' }, { poi_id: 3 }, { poi_id: 3 },
    { poi_id: 12, neden: 'a' }, { poi_id: 16, neden: 'b' }, { poi_id: 7, neden: 'c' }];
  const r = validateGuide(JSON.stringify(bad), ctx, fallback);
  assert.deepEqual(r.guide.oneriler.map((o) => o.poi_id), [3, 12, 16]);
  assert.equal(r.guide.oneriler[0].neden, 'İlgi alanlarına uygun.', 'boş neden yerine varsayılan');
  assert.ok(r.issues.some((i) => /zaten planda/.test(i)));
  assert.ok(r.issues.some((i) => /olmayan öneri/.test(i)));
});

test('D7: fiyat ve planda olmayan saat içeren cümle atılır, plandaki saat kalır', () => {
  const issues = [];
  const allowed = new Set(['09:00']);
  const out = cleanText('Giriş 25 € civarında. Müze 17.30\'da kapanır. Güne 09:00\'da başla. Keyfini çıkar!', 300, { allowedTimes: allowed, issues });
  assert.equal(out, 'Güne 09:00\'da başla. Keyfini çıkar!');
  assert.equal(issues.length, 2);
});

test('D6: HTML, markdown ve web adresi temizlenir; uzun metin kısaltılır', () => {
  const issues = [];
  assert.equal(cleanText('<b>**Harika**</b> bir yer, bkz. https://ornek.com/x', 100, { issues }), 'Harika bir yer, bkz.');
  const long = cleanText('kelime '.repeat(80), 60, { issues });
  assert.ok(long.length <= 60 && long.endsWith('…'));
  assert.ok(issues.some((i) => /kısaltıldı/.test(i)));
});

test('D3: planda olmayan gün atılır, eksik gün şablonla tamamlanır', () => {
  const bad = structuredClone(GOOD);
  bad.gunler = [bad.gunler[0], { gun: 7, baslik: 'Hayali gün', ozet: 'x' }];
  const r = validateGuide(JSON.stringify(bad), ctx, fallback);
  assert.equal(r.guide.gunler.length, 2);
  assert.equal(r.guide.gunler[1].sablon, true);
  assert.equal(r.guide.gunler[1].baslik, fallback.gunler[1].baslik);
  assert.ok(r.issues.some((i) => /olmayan gün/.test(i)));
});

// ---------- yedek (şablon) ----------

test('şablon: her gün için başlık/özet; öneriler adaylardan; uydurma yok', () => {
  assert.equal(fallback.gunler.length, 2);
  assert.equal(fallback.gunler[0].baslik, 'Fatih günü');
  assert.match(fallback.gunler[0].ozet, /09:00–11:15/);
  assert.deepEqual(fallback.oneriler.map((o) => o.poi_id), [3, 12, 16]);
  assert.match(fallback.genel_bakis, /tarih & müze ve manzara/);
  assert.deepEqual(buildFallbackGuide(ctx), fallback, 'deterministik');
});

// ---------- uçtan uca akış (sahte model) ----------

const fakeLlm = (impl) => ({ model: 'sahte-model', isConfigured: () => true, chatJson: impl });
const answer = (content, finish = 'stop') => async () => ({ content, finishReason: finish, model: 'sahte-model', latencyMs: 12, usage: { input: 10, output: 20 } });

test('akış: geçerli yanıt → kaynak yapay-zeka, durum gecerli, günlükte süre ve token', async () => {
  const { guide, log } = await generateGuide(ctx, { llm: fakeLlm(answer(JSON.stringify(GOOD))) });
  assert.equal(guide.kaynak, 'yapay-zeka');
  assert.equal(guide.durum, 'gecerli');
  assert.equal(guide.istem_surumu, PROMPT_VERSION);
  assert.equal(log.status, 'gecerli');
  assert.equal(log.latencyMs, 12);
  assert.equal(log.promptHash.length, 64);
});

test('akış: kısmen hatalı yanıt → düzeltilir, kullanıcıya bildirilir', async () => {
  const bad = structuredClone(GOOD);
  bad.oneriler.push({ poi_id: 999, neden: 'uydurma' });
  const { guide, log } = await generateGuide(ctx, { llm: fakeLlm(answer(JSON.stringify(bad))) });
  assert.equal(guide.durum, 'duzeltildi');
  assert.match(guide.uyarilar[0], /1 sorun/);
  assert.equal(log.issues.length, 1);
});

test('akış: anahtar yok / servis hatası / geçersiz yanıt → şablon, neden açıkça yazılır', async () => {
  const off = await generateGuide(ctx, { llm: { isConfigured: () => false } });
  assert.equal(off.guide.kaynak, 'sablon'); assert.equal(off.log.status, 'ayarsiz');

  const err = await generateGuide(ctx, { llm: fakeLlm(async () => { throw new Error('zaman aşımı'); }) });
  assert.equal(err.guide.kaynak, 'sablon'); assert.equal(err.log.status, 'hata');
  assert.match(err.guide.uyarilar[0], /zaman aşımı/);

  const junk = await generateGuide(ctx, { llm: fakeLlm(answer('Tabii! İşte planın: güzel bir gezi.')) });
  assert.equal(junk.guide.kaynak, 'sablon'); assert.equal(junk.log.status, 'gecersiz');
  assert.equal(junk.log.output, 'Tabii! İşte planın: güzel bir gezi.', 'ham yanıt incelemek için günlükte');

  const cut = await generateGuide(ctx, { llm: fakeLlm(answer('{"genel_bakis": "İki gün', 'length')) });
  assert.equal(cut.guide.kaynak, 'sablon');
  assert.ok(cut.log.issues.some((i) => /kesildi/.test(i)));
});
