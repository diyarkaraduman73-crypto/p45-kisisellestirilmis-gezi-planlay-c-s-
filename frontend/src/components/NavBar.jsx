import { useAuth } from '../auth/AuthContext.jsx';
import { navigate, useRoute } from '../hooks/useRoute.js';
import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import pkg from '../../package.json';

const ROLE_LABEL = { gezgin: 'Gezgin', yonetici: 'Yönetici' };

// Ara sürüm (Hafta 8): arayüz ve API sürümü + veri kaynağı. Sürümler farklıysa uyarır
// (ör. Vercel yeni sürümü yayınladı ama Render hâlâ eskiyi çalıştırıyor).
function VersionBadge() {
  const [health, setHealth] = useState(null);
  useEffect(() => { api.health().then(setHealth).catch(() => setHealth({ status: 'down' })); }, []);
  const mismatch = health?.version && health.version !== pkg.version;
  const title = !health ? 'API kontrol ediliyor…'
    : health.status !== 'ok' ? 'API’ye ulaşılamadı'
    : `Arayüz v${pkg.version} · API v${health.version} · veri: ${health.database}`;
  return (
    <span className={`version${mismatch || health?.status === 'down' ? ' warn' : ''}`} title={title}>
      v{pkg.version}{mismatch ? ` ≠ API v${health.version}` : ''}
    </span>
  );
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const { path } = useRoute();
  const link = (to, label) => (
    <a href={`#${to}`} className={path === to ? 'active' : ''}>{label}</a>
  );

  return (
    <header className="topbar">
      <a href="#/" className="logo">🧭 Gezi Planlayıcı</a>
      <VersionBadge />
      <nav className="nav">
        {link('/', 'Keşfet')}
        {user && link('/planla', 'Planla')}
        {user && link('/profil', 'Profilim')}
        {user && link('/rotalarim', 'Rotalarım')}
        {user?.role === 'yonetici' && link('/yonetim', 'Yönetim')}
      </nav>
      <div className="nav-user">
        {user ? (
          <>
            <span className="who">
              {user.full_name} <span className={`badge ${user.role}`}>{ROLE_LABEL[user.role]}</span>
            </span>
            <button className="ghost" onClick={async () => { await logout(); navigate('/'); }}>Çıkış</button>
          </>
        ) : (
          <>
            <a href="#/giris" className="ghost as-link">Giriş</a>
            <a href="#/kayit" className="primary as-link">Kayıt ol</a>
          </>
        )}
      </div>
    </header>
  );
}
