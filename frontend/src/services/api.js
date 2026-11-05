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
  pois: ({ city, interests = [], q } = {}) => {
    const p = new URLSearchParams();
    if (city) p.set('city', city);
    if (interests.length) p.set('interests', interests.join(','));
    if (q) p.set('q', q);
    return request(`/api/pois?${p}`);
  },

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

  // yönetici
  users: () => request('/api/users?limit=100'),
  changeRole: (id, role) => request(`/api/users/${id}/role`, { method: 'PATCH', body: { role } }),
  createPoi: (data) => request('/api/pois', { method: 'POST', body: data }),
  deletePoi: (id) => request(`/api/pois/${id}`, { method: 'DELETE' }),
};
