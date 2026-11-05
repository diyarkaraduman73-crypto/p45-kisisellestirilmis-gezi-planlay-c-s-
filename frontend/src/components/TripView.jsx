// Rota görünümü (önizleme, kayıtlı rota ve paylaşım sayfası ortak kullanır):
// gün sekmeleri + zaman çizelgesi + harita
import { useState } from 'react';
import RouteMap, { dayColor } from './RouteMap.jsx';
import DayTimeline from './DayTimeline.jsx';

export default function TripView({ days, start, totals, header }) {
  const [active, setActive] = useState(days[0]?.day_number ?? 1);
  const day = days.find((d) => d.day_number === active) ?? days[0];

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
      </aside>
      <section className="map-wrap">
        <RouteMap days={days} start={start} activeDay={active} />
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
