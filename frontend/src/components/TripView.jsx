// Rota görünümü (önizleme, kayıtlı rota ve paylaşım sayfası ortak kullanır):
// gün sekmeleri + zaman çizelgesi + harita
import { useEffect, useRef, useState } from 'react';
import RouteMap, { dayColor } from './RouteMap.jsx';
import DayTimeline from './DayTimeline.jsx';

// loadPath(day) → Promise<{ source, legs, warning? }>: o günün gerçek yürüme yolu (Hafta 9, harita servisi)
// footer(activeDay): zaman çizelgesinin altına eklenecek içerik (ör. yapay zekâ rehberi, Hafta 10)
export default function TripView({ days, start, totals, header, loadPath, footer }) {
  const [active, setActive] = useState(days[0]?.day_number ?? 1);
  const day = days.find((d) => d.day_number === active) ?? days[0];

  // Gün başına yol: her gün yalnızca ilk açıldığında bir kez istenir (sekmeler arasında gidip gelmek kota harcamaz)
  const [paths, setPaths] = useState({});
  const requested = useRef(new Set());
  useEffect(() => {
    if (!loadPath || !day || day.items.length < 1 || requested.current.has(day.day_number)) return;
    const n = day.day_number;
    requested.current.add(n);
    setPaths((p) => ({ ...p, [n]: { loading: true } }));
    loadPath(day)
      .then((r) => setPaths((p) => ({ ...p, [n]: r })))
      .catch((e) => {
        requested.current.delete(n); // hata kalıcı değil: sekmeye dönünce yeniden denenir
        setPaths((p) => ({ ...p, [n]: { source: 'duz-cizgi', legs: null, warning: `Gerçek yol alınamadı: ${e.message}` } }));
      });
  }, [day, loadPath]);

  return (
    <div className="trip-view">
      <aside className="trip-side">
        {header}
        {totals && (
          <p className="totals">
            <strong>{totals.stops}</strong> durak · <strong>{Number(totals.km).toFixed(1)}</strong> km yol ·{' '}
            <strong>{Math.round(totals.travel_minutes)}</strong> dk yolculuk
          </p>
        )}
        <div className="day-tabs" role="tablist">
          {days.map((d) => (
            <button key={d.day_number} role="tab" aria-selected={d.day_number === active}
                    className={d.day_number === active ? 'active' : ''} style={{ '--day': dayColor(d.day_number) }}
                    onClick={() => setActive(d.day_number)}>
              {d.day_number}. gün <small>{d.items.length}</small>
            </button>
          ))}
        </div>
        {day && (
          <>
            <p className="muted day-summary">{day.summary}</p>
            {day.items.length ? <DayTimeline day={day} /> : <p className="muted">Bu gün için durak yok.</p>}
          </>
        )}
        {footer?.(active)}
      </aside>
      <section className="map-wrap">
        <RouteMap days={days} start={start} activeDay={active} path={paths[active]} />
      </section>
    </div>
  );
}

// API'den gelen kayıtlı rotayı (items içinde start_time "HH:MM") görünüm biçimine çevirir
export function savedTripToView(trip) {
  const days = trip.days.map((d) => ({ ...d, lunch: null, summary: d.summary ?? '' }));
  const all = days.flatMap((d) => d.items);
  return {
    days,
    start: trip.start_lat != null ? { lat: trip.start_lat, lng: trip.start_lng } : null,
    totals: {
      stops: all.length,
      km: all.reduce((a, x) => a + Number(x.travel_km ?? 0), 0),
      travel_minutes: all.reduce((a, x) => a + (x.travel_minutes ?? 0), 0),
    },
  };
}
