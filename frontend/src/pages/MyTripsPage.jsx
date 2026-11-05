import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../services/api.js';

// Yalnızca KENDİ rotaları listelenir; sunucu da başka kullanıcının listesini 403 ile reddeder.
export default function MyTripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.myTrips(user.id).then(setTrips).catch((e) => setError(e.message));
  }, [user.id]);

  return (
    <main className="page">
      <div className="page-head">
        <h1>Rotalarım</h1>
        <a className="primary as-link" href="#/planla">+ Yeni rota planla</a>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {trips === null && !error && <p className="muted">Yükleniyor…</p>}
      {trips?.length === 0 && (
        <section className="card">
          <p>Henüz kayıtlı rotan yok. İlgi profiline göre birkaç saniyede gün gün plan üretebilirsin.</p>
          <a className="primary as-link" href="#/planla">Rota planla</a>
        </section>
      )}
      <div className="trip-grid">
        {trips?.map((t) => (
          <a key={t.id} href={`#/rota/${t.id}`} className="card trip trip-link">
            <h2>{t.title}</h2>
            <p className="muted">
              {t.city} · {t.day_count} gün · {t.stop_count} durak{t.start_date ? ` · ${String(t.start_date).slice(0, 10)}` : ''}
            </p>
            <p className="tags-line">
              {t.generated && <span className="badge">otomatik · {t.pace}</span>}
              {t.is_public && <span className="badge">paylaşımda</span>}
            </p>
          </a>
        ))}
      </div>
    </main>
  );
}
