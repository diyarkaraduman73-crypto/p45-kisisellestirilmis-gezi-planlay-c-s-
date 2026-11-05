// Bir günün zaman çizelgesi: yolculuk → ziyaret → (öğle arası) → ...
import { dayColor } from './RouteMap.jsx';

const MODE = { yuruyus: '🚶 yürüyüş', 'toplu-tasima': '🚋 toplu taşıma' };
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60 ? `${m % 60} dk` : ''}`.trim() : `${m} dk`);

export default function DayTimeline({ day }) {
  const color = dayColor(day.day_number);
  const lunch = day.lunch;
  let lunchShown = false;

  return (
    <ol className="timeline" style={{ '--day': color }}>
      {day.items.map((it, idx) => {
        const showLunch = lunch && !lunchShown && it.start_time >= lunch.end;
        if (showLunch) lunchShown = true;
        return (
          <li key={it.poi_id}>
            {showLunch && <div className="tl-break">🍽 Öğle arası · {lunch.start}–{lunch.end}</div>}
            {it.travel_minutes > 0 && (
              <div className="tl-travel">
                {MODE[it.travel_mode] ?? 'yol'} · {it.travel_minutes} dk · {Number(it.travel_km).toFixed(1)} km
              </div>
            )}
            <div className={`tl-stop ${it.is_active === false ? 'inactive' : ''}`}>
              <span className="tl-num">{idx + 1}</span>
              <span className="tl-time">{it.start_time}<br /><small>{it.end_time}</small></span>
              <span className="tl-body">
                <strong>{it.name}</strong>
                {it.must && <span className="badge">zorunlu</span>}
                {it.is_active === false && <span className="badge">artık katalogda yok</span>}
                <br />
                <small className="muted">{fmtMin(it.visit_minutes ?? 0)} ziyaret</small>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
