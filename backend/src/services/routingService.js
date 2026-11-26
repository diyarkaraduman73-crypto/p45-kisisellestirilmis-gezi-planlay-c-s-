// İŞ KATMANI: Harita entegrasyonu — duraklar arasındaki GERÇEK yürüme yolunu harici servisten alır.
//
// Servis : openrouteservice (HeiGIT) Directions API v2, profil "foot-walking", GeoJSON çıktı
//          POST {ORS_API_URL}/v2/directions/foot-walking/geojson   (Authorization: <ORS_API_KEY>)
//          Not: eski adres api.openrouteservice.org 24.11.2026'da kapatıldı; yeni adres api.heigit.org/openrouteservice
//
// Kurallar:
//  H1  API anahtarı yalnızca sunucuda, ortam değişkeninde (ORS_API_KEY); tarayıcıya ve depoya hiç gitmez
//  H2  Servis yoksa / hata verirse / sınır dolduysa harita YİNE çalışır: düz çizgi + kullanıcıya uyarı (yedek)
//  H3  Zaman aşımı 8 sn, geçici hatada 1 yeniden deneme (utils/httpClient.js)
//  H4  Dışarıya giden istekler ücretsiz planın altında tutulur: dakikada en fazla 30 (plan sınırı 40/dk, 2000/gün)
//  H5  Aynı nokta dizisi 24 saat önbellekten verilir (aynı rotayı açan herkes kota harcamaz)
//  H6  Bir istekte en fazla 12 nokta; noktalar şehrin hizmet alanı içinde olmalı (servisimiz başkalarına
//      ücretsiz "harita vekili" olmasın)
import { fetchJson } from '../utils/httpClient.js';
import { createRateLimiter, createTtlCache } from '../utils/rateLimit.js';
import { distanceKm } from '../utils/geo.js';

export const MAX_POINTS = 12;
const PROFILE = 'foot-walking';

const round5 = (n) => Math.round(n * 1e5) / 1e5;

// Yedek: noktaları düz çizgiyle birleştir
function straight(points, modes, warning) {
  const legs = [];
  for (let i = 1; i < points.length; i++) {
    legs.push({ mode: modes[i - 1] ?? null, coordinates: [[points[i - 1].lat, points[i - 1].lng], [points[i].lat, points[i].lng]] });
  }
  return { source: 'duz-cizgi', legs, distance_km: null, duration_min: null, warning };
}

// ORS GeoJSON yanıtı → her bacak (iki durak arası) için ayrı koordinat dizisi
// properties.way_points: her durak noktasının coordinates dizisindeki sırası, ör. [0, 57, 120]
export function parseOrsGeojson(data, modes) {
  const f = data?.features?.[0];
  const coords = f?.geometry?.coordinates;
  const wp = f?.properties?.way_points;
  if (!Array.isArray(coords) || coords.length < 2 || !Array.isArray(wp) || wp.length < 2) {
    throw new Error('Beklenmeyen yanıt biçimi');
  }
  const latLng = coords.map(([lng, lat]) => [lat, lng]); // GeoJSON [boylam, enlem] → Leaflet [enlem, boylam]
  const segs = f.properties.segments || [];
  const legs = [];
  for (let i = 1; i < wp.length; i++) {
    legs.push({
      mode: modes[i - 1] ?? null,
      coordinates: latLng.slice(wp[i - 1], wp[i] + 1),
      walk_km: segs[i - 1] ? Math.round(segs[i - 1].distance / 10) / 100 : null,
      walk_min: segs[i - 1] ? Math.round(segs[i - 1].duration / 60) : null,
    });
  }
  const s = f.properties.summary || {};
  return {
    source: 'openrouteservice',
    profile: PROFILE,
    legs,
    distance_km: s.distance != null ? Math.round(s.distance / 10) / 100 : null,
    duration_min: s.duration != null ? Math.round(s.duration / 60) : null,
    attribution: '© openrouteservice.org by HeiGIT | Harita verisi © OpenStreetMap katkıda bulunanlar',
  };
}

// Bağımlılıklar dışarıdan verilebilir → testte sahte fetch ve saat kullanılır
export function createRoutingService({
  apiKey = process.env.ORS_API_KEY,
  baseUrl = process.env.ORS_API_URL || 'https://api.heigit.org/openrouteservice',
  fetchImpl = globalThis.fetch,
  limiter = createRateLimiter({ max: 30, windowMs: 60_000 }),
  cache = createTtlCache({ max: 500, ttlMs: 24 * 60 * 60 * 1000 }),
  timeoutMs = 8000,
  logger = console,
} = {}) {
  return {
    isConfigured: () => Boolean(apiKey),

    // points: [{lat,lng}] (2..12), modes: her bacağın plandaki ulaşım türü (yalnızca çizim stili için)
    async walkingPath(points, modes = []) {
      if (points.length < 2) return { source: 'yok', legs: [], distance_km: 0, duration_min: 0 };
      if (!apiKey) return straight(points, modes, 'Harita servisi ayarlı değil (ORS_API_KEY); duraklar düz çizgiyle gösteriliyor.');

      const key = points.map((p) => `${round5(p.lat)},${round5(p.lng)}`).join(';');
      const hit = cache.get(key);
      if (hit) return { ...hit, legs: hit.legs.map((l, i) => ({ ...l, mode: modes[i] ?? null })), cached: true };

      const slot = limiter.take('ors');
      if (!slot.ok) {
        return straight(points, modes, `Harita servisinin dakikalık sınırına ulaşıldı; ${slot.retryAfter} sn sonra yeniden deneyin.`);
      }

      try {
        const data = await fetchJson(`${baseUrl.replace(/\/$/, '')}/v2/directions/${PROFILE}/geojson`, {
          method: 'POST',
          headers: { Authorization: apiKey }, // anahtar başlıkta: URL'de olsaydı sunucu kayıtlarına düşebilirdi
          body: { coordinates: points.map((p) => [p.lng, p.lat]), instructions: false, radiuses: points.map(() => 350) },
          timeoutMs,
          retries: 1,
          service: 'Harita servisi',
          fetchImpl,
        });
        const result = parseOrsGeojson(data, modes);
        cache.set(key, result);
        return result;
      } catch (err) {
        logger.warn?.(`[harita] ${err.message}${err.upstreamStatus ? ` (karşı taraf ${err.upstreamStatus})` : ''}`);
        const reason = err.kind === 'zaman-asimi' ? 'harita servisi zamanında yanıt vermedi'
          : err.kind === 'hiz-siniri' ? 'harita servisinin istek sınırı doldu'
          : err.kind === 'anahtar' ? 'harita servisi anahtarı geçersiz'
          : 'harita servisine şu anda ulaşılamıyor';
        return straight(points, modes, `Gerçek yol çizilemedi (${reason}); duraklar düz çizgiyle gösteriliyor.`);
      }
    },
  };
}

// Uygulamanın kullandığı tek örnek
export const routing = createRoutingService();

// Rota (veya gün) → çizilecek noktalar ve bacak türleri
export function dayPoints(day, start) {
  const points = day.items.map((it) => ({ lat: Number(it.lat), lng: Number(it.lng) }));
  const modes = day.items.map((it) => it.travel_mode ?? null);
  if (start) return { points: [start, ...points], modes };
  return { points, modes: modes.slice(1) }; // başlangıç yoksa ilk durağa yol yok
}

// İstemciden gelen nokta listesini doğrular (H6)
export function validatePoints(raw, city) {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > MAX_POINTS) {
    return { error: `2 ile ${MAX_POINTS} arasında nokta gönderilmeli` };
  }
  const points = [];
  for (const p of raw) {
    const lat = Number(p?.lat);
    const lng = Number(p?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return { error: 'Nokta koordinatları geçersiz' };
    }
    if (city && distanceKm(city.center_lat, city.center_lng, lat, lng) > city.radius_km) {
      return { error: `Noktalar ${city.name} hizmet alanının dışında` };
    }
    points.push({ lat, lng });
  }
  return { points };
}
