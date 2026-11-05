// Arayüz tarafı koruma: giriş yoksa giriş sayfasına yönlendirir, rol uymuyorsa 403 gösterir.
// ÖNEMLİ: Bu yalnızca kullanıcı deneyimi içindir. Asıl güvenlik backend'de
// (requireAuth / requireRole / sahiplik kontrolleri). Tarayıcıdaki kod değiştirilebilir;
// arayüzde gizlenen bir sayfanın API'si yine de sunucuda korunur.
import { useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { navigate, useRoute } from '../hooks/useRoute.js';

export default function ProtectedRoute({ roles, children }) {
  const { user, ready } = useAuth();
  const { path } = useRoute();

  useEffect(() => {
    if (ready && !user) navigate(`/giris?sonra=${encodeURIComponent(path)}`);
  }, [ready, user, path]);

  if (!ready) return <main className="page"><p className="muted">Yükleniyor…</p></main>;
  if (!user) return null;

  if (roles && !roles.includes(user.role)) {
    return (
      <main className="page narrow">
        <section className="card">
          <h1>403 · Yetkiniz yok</h1>
          <p>Bu sayfa yalnızca <strong>{roles.join(', ')}</strong> rolündeki kullanıcılar içindir.</p>
          <a className="primary as-link" href="#/">Ana sayfaya dön</a>
        </section>
      </main>
    );
  }
  return children;
}
