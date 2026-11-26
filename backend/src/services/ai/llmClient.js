// Yapay zekâ modeli istemcisi: Groq (OpenAI uyumlu Chat Completions API)
//   POST https://api.groq.com/openai/v1/chat/completions   Authorization: Bearer <GROQ_API_KEY>
//
// - Anahtar yalnızca sunucuda (GROQ_API_KEY); model GROQ_MODEL ile değiştirilebilir
// - JSON modu: response_format = { type: "json_object" } → model geçerli bir JSON nesnesi döndürmeye zorlanır
//   (şemaya uyup uymadığını yine de biz doğrularız: guideValidator.js)
// - Zaman aşımı 20 sn, geçici hatada 1 yeniden deneme (utils/httpClient.js)
// - Dışarıya dakikada en fazla 20 istek (ücretsiz planın altında)
import { fetchJson, ExternalServiceError } from '../../utils/httpClient.js';
import { createRateLimiter } from '../../utils/rateLimit.js';

export const DEFAULT_MODEL = 'openai/gpt-oss-20b';

export function createLlmClient({
  apiKey = process.env.GROQ_API_KEY,
  model = process.env.GROQ_MODEL || DEFAULT_MODEL,
  baseUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1',
  fetchImpl = globalThis.fetch,
  timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 20000,
  limiter = createRateLimiter({ max: 20, windowMs: 60_000 }),
  now = () => Date.now(),
} = {}) {
  return {
    model,
    isConfigured: () => Boolean(apiKey),

    // { system, user, maxTokens, temperature } → { content, model, latencyMs, usage, finishReason }
    async chatJson({ system, user, maxTokens = 2500, temperature = 0.4 }) {
      if (!apiKey) throw new ExternalServiceError('Yapay zekâ servisi ayarlı değil (GROQ_API_KEY)', { status: 503, service: 'Yapay zekâ servisi', kind: 'anahtar' });
      const slot = limiter.take('groq');
      if (!slot.ok) {
        throw new ExternalServiceError('Yapay zekâ servisinin dakikalık sınırına ulaşıldı', { status: 503, service: 'Yapay zekâ servisi', kind: 'hiz-siniri', retryAfter: slot.retryAfter });
      }
      const body = {
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature,                       // düşük: tutarlı, uydurmaya daha az eğilimli
        max_completion_tokens: maxTokens,
        response_format: { type: 'json_object' },
      };
      // gpt-oss "düşünen" bir model; kısa düşünme yeterli ve daha hızlı
      if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';

      const t0 = now();
      const data = await fetchJson(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
        timeoutMs,
        retries: 1,
        service: 'Yapay zekâ servisi',
        fetchImpl,
      });
      const choice = data?.choices?.[0];
      return {
        content: typeof choice?.message?.content === 'string' ? choice.message.content : '',
        finishReason: choice?.finish_reason ?? null,
        model: data?.model ?? model,
        latencyMs: now() - t0,
        usage: { input: data?.usage?.prompt_tokens ?? null, output: data?.usage?.completion_tokens ?? null },
      };
    },
  };
}

export const llm = createLlmClient();
