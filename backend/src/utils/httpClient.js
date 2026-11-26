// Harici API'lere (harita, yapay zekâ) yapılan tüm HTTP çağrıları buradan geçer.
//
// Ne sağlar?
//  - ZAMAN AŞIMI: servis cevap vermezse istek timeoutMs sonra iptal edilir (AbortController) → 504
//  - YENİDEN DENEME: geçici hatalarda (ağ, zaman aşımı, 5xx, kısa 429) üstel bekleme ile tekrar dener
//  - HIZ SINIRI (429): Retry-After kısa ise bekleyip dener, uzunsa 503 + retryAfter ile vazgeçer
//  - HATA SINIFLANDIRMA: 401/403 → "anahtar geçersiz", diğer 4xx → "istek reddedildi", bozuk JSON → 502
//  - GİZLİLİK: hata mesajlarına URL sorgu dizesi ve başlıklar (API anahtarı) yazılmaz
import { AppError } from './errors.js';

export class ExternalServiceError extends AppError {
  // status: istemcimize döneceğimiz kod (502 kötü yanıt, 503 geçici olarak yok, 504 zaman aşımı)
  constructor(message, { status = 502, service = 'harici servis', upstreamStatus, retryAfter, kind } = {}) {
    super(message, status);
    this.service = service;
    this.upstreamStatus = upstreamStatus; // karşı servisin döndürdüğü kod (yalnızca kayıt için)
    this.retryAfter = retryAfter;         // saniye
    this.kind = kind;                     // 'zaman-asimi' | 'ag' | 'hiz-siniri' | 'anahtar' | 'istek' | 'sunucu' | 'yanit'
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function retryAfterSeconds(res) {
  const v = res.headers?.get?.('retry-after');
  if (!v) return undefined;
  const n = Number(v);
  if (Number.isFinite(n)) return Math.max(0, n);
  const date = Date.parse(v);
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

/**
 * JSON istek gönderir, JSON yanıt döner.
 * @param {string} url
 * @param {object} opts { method, headers, body (nesne), timeoutMs, retries, service, fetchImpl, maxWaitSeconds }
 */
export async function fetchJson(url, opts = {}) {
  const {
    method = 'GET', headers = {}, body, timeoutMs = 8000, retries = 1,
    service = 'harici servis', fetchImpl = globalThis.fetch, maxWaitSeconds = 2, backoffMs = 400,
  } = opts;
  const where = new URL(url).host; // hata mesajı için yalnızca alan adı (sorgu dizesinde anahtar olabilir)

  for (let attempt = 0; ; attempt++) {
    const last = attempt >= retries;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(url, {
        method,
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const timedOut = err?.name === 'AbortError';
      if (!last) { await sleep(backoffMs * 2 ** attempt); continue; }
      throw new ExternalServiceError(
        timedOut ? `${service} ${timeoutMs / 1000} saniyede yanıt vermedi` : `${service} sunucusuna ulaşılamadı (${where})`,
        { status: timedOut ? 504 : 503, service, kind: timedOut ? 'zaman-asimi' : 'ag' }
      );
    }

    let text;
    try {
      text = await res.text();
    } catch (err) {
      clearTimeout(timer);
      const timedOut = err?.name === 'AbortError';
      if (!last) { await sleep(backoffMs * 2 ** attempt); continue; }
      throw new ExternalServiceError(`${service} yanıtı yarıda kesildi`, { status: timedOut ? 504 : 502, service, kind: timedOut ? 'zaman-asimi' : 'ag' });
    }
    clearTimeout(timer);

    if (res.status === 429) {
      const wait = retryAfterSeconds(res);
      if (!last && (wait === undefined || wait <= maxWaitSeconds)) {
        await sleep(wait !== undefined ? wait * 1000 : backoffMs * 2 ** attempt);
        continue;
      }
      throw new ExternalServiceError(`${service} istek sınırına ulaşıldı, biraz sonra tekrar deneyin`,
        { status: 503, service, upstreamStatus: 429, retryAfter: wait, kind: 'hiz-siniri' });
    }
    if (res.status >= 500) {
      if (!last) { await sleep(backoffMs * 2 ** attempt); continue; }
      throw new ExternalServiceError(`${service} şu anda hata veriyor (${res.status})`,
        { status: 502, service, upstreamStatus: res.status, kind: 'sunucu' });
    }
    if (res.status === 401 || res.status === 403) {
      // Yeniden denemenin anlamı yok; anahtar yanlış/eksik ya da yetkisi yok
      throw new ExternalServiceError(`${service} API anahtarı geçersiz veya yetkisiz`,
        { status: 502, service, upstreamStatus: res.status, kind: 'anahtar' });
    }
    if (!res.ok) {
      throw new ExternalServiceError(`${service} isteği reddetti (${res.status})`,
        { status: 502, service, upstreamStatus: res.status, kind: 'istek' });
    }
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      throw new ExternalServiceError(`${service} geçersiz bir yanıt döndürdü`, { status: 502, service, kind: 'yanit' });
    }
  }
}
