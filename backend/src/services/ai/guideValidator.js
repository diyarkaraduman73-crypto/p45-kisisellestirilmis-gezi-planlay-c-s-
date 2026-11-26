// ÇIKTI DOĞRULAMA: Yapay zekânın yanıtına KÖRÜ KÖRÜNE güvenilmez.
//
// Kontroller (her biri ihlalde düzeltir veya atar ve "issues" listesine yazar):
//  D1  JSON mı? (```json çiti veya ön/arka metin varsa ayıklanır)
//  D2  Şema: genel_bakis metin, gunler dizi, oneriler dizi; tipler doğru
//  D3  Gün numarası planda var mı? Eksik günler şablonla tamamlanır
//  D4  İpucundaki poi_id O GÜNÜN planında mı? (uydurma/yanlış güne ait durak atılır)
//  D5  Öneri poi_id'si aday listesinde mi ve planda değil mi? En fazla 3, tekrar yok
//  D6  Metin temizliği: HTML, markdown, web adresi silinir; uzunluk sınırı
//  D7  Doğrulanamayan bilgi: fiyat/ücret (TL, ₺, € ...) ve planda OLMAYAN saat içeren cümleler atılır
//  D8  Kullanılabilir içerik kalmadıysa → geçersiz (yedek şablon kullanılır)
import { LIMITS } from './guidePrompt.js';

const PRICE = /(\d[\d.,]*\s*(tl|₺|lira|try|euro|eur|€|\$|usd|dolar))|((tl|₺|€|\$)\s*\d)|(ücretsiz|bedava|giriş ücreti)/i;
const TIME = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g;

// ```json ... ``` veya "İşte rehber: {...}" gibi sarılmış yanıttan JSON nesnesini çıkarır
export function extractJson(text) {
  if (typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(body.slice(start, end + 1)); } catch { return null; }
}

// D6 + D7
export function cleanText(value, max, { allowedTimes = new Set(), issues = [], where = 'metin' } = {}) {
  if (typeof value !== 'string') return '';
  let s = value
    .replace(/<[^>]*>/g, ' ')                       // HTML
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')      // web adresleri
    .replace(/[*_`#>]+/g, '')                       // markdown işaretleri
    .replace(/\s+/g, ' ')
    .trim();
  // Cümle cümle bak: fiyat veya planda olmayan saat içeren cümleyi at
  const sentences = s.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((sen) => {
    if (PRICE.test(sen)) { issues.push(`${where}: doğrulanamayan fiyat/ücret bilgisi çıkarıldı`); return false; }
    const times = [...sen.matchAll(TIME)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`);
    if (times.some((t) => !allowedTimes.has(t))) { issues.push(`${where}: planda olmayan saat içeren cümle çıkarıldı`); return false; }
    return true;
  });
  s = kept.join(' ').trim();
  if (s.length > max) {
    const cut = s.slice(0, max - 1);
    s = `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).trim()}…`;
    issues.push(`${where}: ${max} karakter sınırına kısaltıldı`);
  }
  return s;
}

/**
 * @param raw     modelin ham metin yanıtı
 * @param ctx     { days: [{ day_number, items: [{ poi_id, name, start_time, end_time }] }], candidates: [{ id, name, district, interest_name }] }
 * @param fallback  şablon rehber (eksik günleri tamamlamak için)
 * @returns { valid, guide, issues }
 */
export function validateGuide(raw, ctx, fallback) {
  const issues = [];
  const data = extractJson(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, guide: null, issues: ['Yanıt geçerli bir JSON nesnesi değil'] }; // D1
  }

  const allowedTimes = new Set(ctx.days.flatMap((d) => d.items.flatMap((i) => [i.start_time, i.end_time])));
  const opt = (where) => ({ allowedTimes, issues, where });
  const planIds = new Set(ctx.days.flatMap((d) => d.items.map((i) => i.poi_id)));
  const candById = new Map(ctx.candidates.map((c) => [c.id, c]));

  // D2
  const genel = cleanText(data.genel_bakis, LIMITS.genel, opt('genel bakış'));
  if (typeof data.genel_bakis !== 'string') issues.push('genel_bakis eksik veya metin değil');
  const rawDays = Array.isArray(data.gunler) ? data.gunler : (issues.push('gunler dizi değil'), []);
  const rawRecs = Array.isArray(data.oneriler) ? data.oneriler : (data.oneriler !== undefined && issues.push('oneriler dizi değil'), []);

  // D3, D4
  const byDay = new Map();
  for (const g of rawDays) {
    const n = Number(g?.gun);
    const planDay = ctx.days.find((d) => d.day_number === n);
    if (!planDay) { issues.push(`Planda olmayan gün (${g?.gun}) atıldı`); continue; }
    if (byDay.has(n)) { issues.push(`${n}. gün iki kez verilmiş, ilki kullanıldı`); continue; }
    const dayIds = new Map(planDay.items.map((i) => [i.poi_id, i]));
    const seen = new Set();
    const ipuclari = [];
    for (const t of Array.isArray(g.ipuclari) ? g.ipuclari : []) {
      const id = Number(t?.poi_id);
      const stop = dayIds.get(id);
      if (!stop) {
        issues.push(planIds.has(id) ? `${n}. gün: başka güne ait durak için ipucu atıldı` : `${n}. gün: planda olmayan yer (#${t?.poi_id}) için ipucu atıldı`);
        continue;
      }
      if (seen.has(id)) continue;
      const ipucu = cleanText(t.ipucu, LIMITS.ipucu, opt(`${n}. gün ipucu`));
      if (!ipucu) continue;
      seen.add(id);
      ipuclari.push({ poi_id: id, ad: stop.name, ipucu });
    }
    byDay.set(n, {
      gun: n,
      baslik: cleanText(g.baslik, LIMITS.baslik, opt(`${n}. gün başlığı`)),
      ozet: cleanText(g.ozet, LIMITS.ozet, opt(`${n}. gün özeti`)),
      ipuclari,
    });
  }
  const gunler = ctx.days.map((d) => {
    const g = byDay.get(d.day_number);
    if (g && (g.baslik || g.ozet)) {
      const fb = fallback?.gunler.find((x) => x.gun === d.day_number);
      return { ...g, baslik: g.baslik || fb?.baslik || `${d.day_number}. gün` };
    }
    issues.push(`${d.day_number}. gün yapay zekâ yanıtında yoktu, şablonla tamamlandı`);
    return { ...(fallback?.gunler.find((x) => x.gun === d.day_number) ?? { gun: d.day_number, baslik: `${d.day_number}. gün`, ozet: '', ipuclari: [] }), sablon: true };
  });

  // D5
  const oneriler = [];
  for (const r of rawRecs) {
    const id = Number(r?.poi_id);
    const c = candById.get(id);
    if (planIds.has(id)) { issues.push(`Öneri #${id} zaten planda, atıldı`); continue; }
    if (!c) { issues.push(`Aday listesinde olmayan öneri (#${r?.poi_id}) atıldı`); continue; }
    if (oneriler.some((o) => o.poi_id === id)) continue;
    if (oneriler.length >= LIMITS.oneri) { issues.push(`${LIMITS.oneri}'ten fazla öneri verildi, fazlası atıldı`); break; }
    const neden = cleanText(r.neden, LIMITS.neden, opt('öneri nedeni'));
    oneriler.push({ poi_id: id, ad: c.name, semt: c.district ?? null, tur: c.interest_name ?? null, neden: neden || 'İlgi alanlarına uygun.' });
  }

  // D8: yapay zekâdan gelen anlamlı içerik yoksa geçersiz say
  const aiDays = gunler.filter((g) => !g.sablon).length;
  if (!genel && aiDays === 0) {
    return { valid: false, guide: null, issues: [...issues, 'Kullanılabilir içerik yok'] };
  }
  return { valid: true, guide: { genel_bakis: genel || fallback?.genel_bakis || '', gunler, oneriler }, issues };
}
