import { useAuth } from '../auth/AuthContext.jsx';
import { navigate, useRoute } from '../hooks/useRoute.js';

const ROLE_LABEL = { gezgin: 'Gezgin', yonetici: 'Yönetici' };

export default function NavBar() {
  const { user, logout } = useAuth();
  const { path } = useRoute();
  const link = (to, label) => (
    <a href={`#${to}`} className={path === to ? 'active' : ''}>{label}</a>
  );

  return (
    <header className="topbar">
      <a href="#/" className="logo">🧭 Gezi Planlayıcı</a>
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
