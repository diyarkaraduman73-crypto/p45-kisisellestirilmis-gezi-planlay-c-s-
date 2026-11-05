import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../services/api.js';

// Rol: gezgin ve yönetici (giriş yapmış herkes). Yalnızca KENDİ rotaları listelenir;
// sunucu da başka kullanıcının listesini 403 ile reddeder.
export default function MyTripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.myTrips(user.id).then(setTrips).catch((e) => setError(e.message));
  }, [user.id]);

  const show = async (id) => {
    if (open?.id === id) return setOpen(null);
    try { setOpen(await api.trip(id)); } catch (e) { setError(e.message); }
  };

  const remove = async (id) => {
    if (!window.confirm('Bu rota silinsin mi?')) return;
    try {
      await api.deleteTrip(id);
      setTrips((t) => t.filter((x) => x.id !== id));
      if (open?.id === id) setOpen(null);
    } catch (e) { setError(e.message); }
  };

  return (
    <main className="page">
      <h1>Rotalarım</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {trips === null && !error && <p className="muted">Yükleniyor…</p>}
      {trips?.length === 0 && (
        <section className="card"><p>Henüz kayıtlı rotan yok. Rota üretimi sonraki haftalarda eklenecek.</p></section>
      )}
      <div className="trip-grid">
        {trips?.map((t) => (
          <section key={t.id} className="card trip">
            <h2>{t.title}</h2>
            <p className="muted">
              {t.city} · {t.day_count} gün · {t.stop_count} durak{t.start_date ? ` · ${String(t.start_date).slice(0, 10)}` : ''}
            </p>
            <div className="actions">
              <button className="ghost" onClick={() => show(t.id)}>{open?.id === t.id ? 'Gizle' : 'Gün planı'}</button>
              <button className="ghost danger" onClick={() => remove(t.id)}>Sil</button>
            </div>
            {open?.id === t.id && (
              <ol className="days">
                {open.days.map((d) => (
                  <li key={d.id}>
                    <strong>{d.day_number}. gün</strong>
                    <ul>
                      {d.items.map((it) => (
                        <li key={it.visit_order}>
                          {it.start_time ? `${it.start_time.slice(0, 5)} · ` : ''}{it.name}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
