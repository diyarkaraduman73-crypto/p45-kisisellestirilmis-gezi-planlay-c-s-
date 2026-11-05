// Kayıtlı rota: gün gün plan + harita + paylaşım ayarları (yalnızca sahibi / yönetici; sunucu 403 verir)
import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { navigate } from '../hooks/useRoute.js';
import TripView, { savedTripToView } from '../components/TripView.jsx';

export const shareUrl = (code) => `${window.location.origin}${window.location.pathname}#/paylasim/${code}`;

export default function TripDetailPage({ id }) {
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.trip(id).then(setTrip).catch((e) => setError(e.message));
  }, [id]);

  const share = async (isPublic, regenerate = false) => {
    setError(''); setMsg('');
    try {
      const r = await api.shareTrip(trip.id, isPublic, regenerate);
      setTrip((t) => ({ ...t, is_public: r.isPublic, share_code: r.shareCode ?? t.share_code }));
      setMsg(regenerate ? 'Yeni bağlantı oluşturuldu; eski bağlantı artık çalışmaz.' : isPublic ? 'Paylaşım açıldı.' : 'Paylaşım kapatıldı.');
    } catch (e) { setError(e.message); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(shareUrl(trip.share_code)); setMsg('Bağlantı kopyalandı.'); }
    catch { setMsg(shareUrl(trip.share_code)); }
  };

  const remove = async () => {
    if (!window.confirm('Bu rota silinsin mi?')) return;
    try { await api.deleteTrip(trip.id); navigate('/rotalarim'); } catch (e) { setError(e.message); }
  };

  if (error && !trip) return <main className="page narrow"><p className="error">{error}</p><a href="#/rotalarim">← Rotalarım</a></main>;
  if (!trip) return <main className="page"><p className="muted">Yükleniyor…</p></main>;

  const view = savedTripToView(trip);
  return (
    <main className="planner-result">
      <TripView
        {...view}
        header={
          <>
            <a href="#/rotalarim" className="link-btn back">← Rotalarım</a>
            <h1>{trip.title}</h1>
            <p className="muted">
              {trip.city} · {trip.day_count} gün{trip.start_date ? ` · ${String(trip.start_date).slice(0, 10)}` : ''}
              {trip.generated ? ` · ${trip.pace} tempo, ${trip.day_start}–${trip.day_end}` : ' · elle oluşturuldu'}
            </p>
            <section className="share-box">
              <label className="switch">
                <input type="checkbox" checked={trip.is_public} onChange={(e) => share(e.target.checked)} />
                <span>Bağlantıya sahip herkes görebilsin</span>
              </label>
              {trip.is_public && (
                <div className="row">
                  <input readOnly value={shareUrl(trip.share_code)} aria-label="Paylaşım bağlantısı" onFocus={(e) => e.target.select()} />
                  <button className="ghost" onClick={copy}>Kopyala</button>
                  <button className="ghost" onClick={() => share(true, true)} title="Eski bağlantıyı geçersiz kıl">Yenile</button>
                </div>
              )}
              <small className="muted">Paylaşılan sayfada adın ve başlangıç noktan (ör. otelin) görünmez.</small>
            </section>
            {msg && <p className="info">{msg}</p>}
            {error && <p className="error" role="alert">{error}</p>}
            <button className="ghost danger" onClick={remove}>Rotayı sil</button>
          </>
        }
      />
    </main>
  );
}
