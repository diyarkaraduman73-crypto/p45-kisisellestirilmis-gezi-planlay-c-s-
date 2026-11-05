// Servis katmanı: backend API ile tüm iletişim buradan geçer.
const API_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const TOKEN_KEY = 'gezi.token';

// Token sessionStorage'da: sekme kapanınca silinir (localStorage'a göre daha kısa ömürlü).
// Risk ve alternatifler için: docs/guvenlik-notu.md
export const tokenStore = {
  get: () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* yok say */ } },
  clear: () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* yok say */ } },
};

function toQuery(f) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    p.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  return p.toString();
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token) {
    // Oturum sunucuda bitti/iptal edildi → istemci tarafını da temizle
    tokenStore.clear();
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok) {
    const err = new Error(data.error || `İstek başarısız (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),
  interests: () => request('/api/interests'),
  tags: () => request('/api/tags'),
  // filtre: { city, interests[], tags[], q, priceMax, lat, lng, radiusKm, includeInactive }
  pois: (f = {}) => request(`/api/pois?${toQuery(f)}`),
  poisForMe: (f = {}) => request(`/api/pois/for-me?${toQuery(f)}`),

  // ilgi profili (her zaman giriş yapan kullanıcının)
  profile: () => request('/api/profile'),
  saveProfile: (data) => request('/api/profile', { method: 'PUT', body: data }),

  // kimlik doğrulama
  register: (data) => request('/api/auth/register', { method: 'POST', body: data }),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/password', { method: 'POST', body: { currentPassword, newPassword } }),

  // gezgin
  myTrips: (userId) => request(`/api/users/${userId}/trips`),
  trip: (id) => request(`/api/trips/${id}`),
  deleteTrip: (id) => request(`/api/trips/${id}`, { method: 'DELETE' }),
  // rota üretimi
  planTrip: (params) => request('/api/trips/plan', { method: 'POST', body: params }),
  generateTrip: (params) => request('/api/trips/generate', { method: 'POST', body: params }),
  shareTrip: (id, isPublic, regenerate = false) =>
    request(`/api/trips/${id}/share`, { method: 'POST', body: { isPublic, regenerate } }),
  sharedTrip: (code) => request(`/api/trips/shared/${encodeURIComponent(code)}`),

  // yönetici
  users: () => request('/api/users?limit=100'),
  changeRole: (id, role) => request(`/api/users/${id}/role`, { method: 'PATCH', body: { role } }),
  createPoi: (data) => request('/api/pois', { method: 'POST', body: data }),
  updatePoi: (id, data) => request(`/api/pois/${id}`, { method: 'PATCH', body: data }),
  createTag: (name) => request('/api/tags', { method: 'POST', body: { name } }),
  deletePoi: (id) => request(`/api/pois/${id}`, { method: 'DELETE' }),
};
