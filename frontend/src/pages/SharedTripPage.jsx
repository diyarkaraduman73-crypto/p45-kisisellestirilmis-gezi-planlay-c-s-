// Herkese açık, salt okunur paylaşım sayfası (giriş gerekmez)
import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import TripView, { savedTripToView } from '../components/TripView.jsx';

export default function SharedTripPage({ code }) {
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.sharedTrip(code).then(setTrip).catch((e) => setError(e.message));
  }, [code]);

  if (error) {
    return (
      <main className="page narrow">
        <section className="card">
          <h1>Rota bulunamadı</h1>
          <p>Bu bağlantı geçersiz ya da rota sahibi paylaşımı kapatmış.</p>
          <a className="primary as-link" href="#/">Keşfet'e git</a>
        </section>
      </main>
    );
  }
  if (!trip) return <main className="page"><p className="muted">Yükleniyor…</p></main>;

  return (
    <main className="planner-result">
      <TripView
        {...savedTripToView(trip)}
        start={null}
        header={
          <>
            <span className="badge">Paylaşılan rota</span>
            <h1>{trip.title}</h1>
            <p className="muted">{trip.city} · {trip.day_count} gün</p>
            <a className="primary as-link" href="#/kayit">Kendi rotanı oluştur</a>
          </>
        }
      />
    </main>
  );
}
