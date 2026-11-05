// Servis katmanı: backend API ile tüm iletişim buradan geçer.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `İstek başarısız (${res.status})`);
  return data;
}

export const api = {
  health: () => request('/api/health'),
  interests: () => request('/api/interests'),
  pois: ({ city, interests = [] } = {}) => {
    const q = new URLSearchParams();
    if (city) q.set('city', city);
    if (interests.length) q.set('interests', interests.join(','));
    return request(`/api/pois?${q}`);
  },
};
