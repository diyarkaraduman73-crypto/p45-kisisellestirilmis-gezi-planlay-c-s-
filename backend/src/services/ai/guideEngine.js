// YAPAY ZEKÂ BİLEŞENİ — çekirdek akış (veritabanı ve HTTP'den bağımsız → tek başına test edilir)
//
//   bağlam (plan + profil + adaylar) → istem → model → DOĞRULAMA → rehber
//                                                   ↘ hata / geçersiz → şablon (yedek)
//
// Sonuç her zaman kullanılabilir bir rehberdir; "kaynak" alanı yapay zekâ mı şablon mu olduğunu,
// "durum" ve "uyarilar" alanları doğrulamada ne olduğunu açıkça söyler (şeffaflık).
import { createHash } from 'node:crypto';
import { buildGuidePrompt, PROMPT_VERSION } from './guidePrompt.js';
import { validateGuide } from './guideValidator.js';
import { buildFallbackGuide } from './fallbackGuide.js';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/**
 * @param ctx { city, pace, budget, interests, days, candidates }
 * @param deps { llm, now }
 * @returns { guide, log }  guide: kullanıcıya gösterilecek, log: ai_logs kaydı
 */
export async function generateGuide(ctx, { llm, now = () => new Date() }) {
  const fallback = buildFallbackGuide(ctx);
  const prompt = buildGuidePrompt(ctx);
  const meta = { istem_surumu: PROMPT_VERSION, uretildi: now().toISOString() };
  const log = { feature: 'gezi-rehberi', promptVersion: PROMPT_VERSION, promptHash: sha256(prompt.system + prompt.user) };

  const useFallback = (status, reason, extra = {}) => ({
    guide: { ...fallback, ...meta, kaynak: 'sablon', model: null, durum: status, uyarilar: [reason] },
    log: { ...log, status, issues: [reason, ...(extra.issues ?? [])], ...extra.log },
  });

  if (!llm?.isConfigured()) {
    return useFallback('ayarsiz', 'Yapay zekâ servisi ayarlı değil; rehber kurallarla (şablon) hazırlandı.');
  }

  let res;
  try {
    res = await llm.chatJson({ system: prompt.system, user: prompt.user });
  } catch (err) {
    return useFallback('hata', `Yapay zekâ servisine ulaşılamadı (${err.message}); rehber kurallarla (şablon) hazırlandı.`,
      { log: { model: llm.model } });
  }

  const llmLog = { model: res.model, latencyMs: res.latencyMs, inputTokens: res.usage.input, outputTokens: res.usage.output, output: res.content };
  const { valid, guide, issues } = validateGuide(res.content, ctx, fallback);
  if (res.finishReason === 'length') issues.unshift('Yanıt uzunluk sınırında kesildi');

  if (!valid) {
    return useFallback('gecersiz', 'Yapay zekâ yanıtı doğrulamadan geçemedi; rehber kurallarla (şablon) hazırlandı.',
      { issues, log: llmLog });
  }
  const status = issues.length ? 'duzeltildi' : 'gecerli';
  return {
    guide: {
      ...guide, ...meta, kaynak: 'yapay-zeka', model: res.model, durum: status,
      uyarilar: issues.length ? [`Yapay zekâ çıktısında ${issues.length} sorun bulundu ve düzeltildi.`] : [],
    },
    log: { ...log, ...llmLog, status, issues },
  };
}
