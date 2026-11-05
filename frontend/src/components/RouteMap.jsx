// Gün gün rota haritası: her gün ayrı renkte çizgi, numaralı duraklar
import { Fragment, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, Popup, useMap } from 'react-leaflet';

export const DAY_COLORS = ['#c2410c', '#2563eb', '#15803d', '#7c3aed', '#db2777', '#0891b2', '#a16207'];
export const dayColor = (n) => DAY_COLORS[(n - 1) % DAY_COLORS.length];

function Fit({ points }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// days: [{ day_number, items: [{ poi_id, name, lat, lng, start_time, end_time }] }]
// activeDay: null = hepsi
export default function RouteMap({ days, start, activeDay = null }) {
  const shown = days.filter((d) => activeDay === null || d.day_number === activeDay);
  const points = shown.flatMap((d) => d.items.map((i) => [i.lat, i.lng]));
  if (start) points.push([start.lat, start.lng]);

  return (
    <MapContainer center={[41.015, 28.98]} zoom={12} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Fit points={points} />
      {start && (
        <CircleMarker center={[start.lat, start.lng]} radius={8}
                      pathOptions={{ color: '#fff', weight: 3, fillColor: '#1f2421', fillOpacity: 1 }}>
          <Tooltip>Başlangıç noktası</Tooltip>
        </CircleMarker>
      )}
      {shown.map((d) => {
        const color = dayColor(d.day_number);
        const line = d.items.map((i) => [i.lat, i.lng]);
        if (start && line.length) line.unshift([start.lat, start.lng]);
        return (
          <Fragment key={d.day_number}>
            <Polyline positions={line} pathOptions={{ color, weight: 4, opacity: 0.75, dashArray: '6 8' }} />
            {d.items.map((it, idx) => (
              <CircleMarker key={it.poi_id} center={[it.lat, it.lng]} radius={11}
                            pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }}>
                <Tooltip permanent direction="center" className="stop-number">{idx + 1}</Tooltip>
                <Popup>
                  <strong>{d.day_number}. gün · {idx + 1}. durak</strong><br />
                  {it.name}<br />
                  <small>{it.start_time}–{it.end_time}</small>
                </Popup>
              </CircleMarker>
            ))}
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
