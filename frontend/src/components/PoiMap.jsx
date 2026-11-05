import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';

export const CATEGORY_COLORS = {
  tarih: '#b45309',
  doga: '#15803d',
  yemek: '#dc2626',
  alisveris: '#7c3aed',
  sanat: '#db2777',
  manzara: '#0284c7',
  dini: '#0f766e',
};

function FitBounds({ pois }) {
  const map = useMap();
  useEffect(() => {
    if (pois.length) map.fitBounds(pois.map((p) => [p.lat, p.lng]), { padding: [30, 30], maxZoom: 15 });
  }, [pois, map]);
  return null;
}

export default function PoiMap({ pois, selectedId, onSelect }) {
  return (
    <MapContainer center={[41.015, 28.98]} zoom={12} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pois={pois} />
      {pois.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={selectedId === p.id ? 11 : 8}
          pathOptions={{ color: '#fff', weight: 2, fillColor: CATEGORY_COLORS[p.interest] || '#444', fillOpacity: 0.95 }}
          eventHandlers={{ click: () => onSelect?.(p.id) }}
        >
          <Popup>
            <strong>{p.name}</strong>
            <br />
            {p.description}
            <br />
            <small>~{p.visit_minutes} dk</small>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
