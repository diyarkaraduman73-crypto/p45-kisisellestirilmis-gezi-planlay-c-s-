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

const PRICE = ['Ücretsiz', '₺', '₺₺', '₺₺₺'];

function FitBounds({ pois, userLocation }) {
  const map = useMap();
  useEffect(() => {
    const pts = pois.map((p) => [p.lat, p.lng]);
    if (userLocation) pts.push([userLocation.lat, userLocation.lng]);
    if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
  }, [pois, userLocation, map]);
  return null;
}

function FlyTo({ poi }) {
  const map = useMap();
  useEffect(() => {
    if (poi) map.flyTo([poi.lat, poi.lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
  }, [poi, map]);
  return null;
}

export default function PoiMap({ pois, selectedId, onSelect, userLocation, tagName = (t) => t }) {
  return (
    <MapContainer center={[41.015, 28.98]} zoom={12} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pois={pois} userLocation={userLocation} />
      <FlyTo poi={pois.find((p) => p.id === selectedId)} />
      {userLocation && (
        <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={7}
                      pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}>
          <Popup>Konumun</Popup>
        </CircleMarker>
      )}
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
            {p.district && <> · {p.district}</>}
            <br />
            {p.description}
            <br />
            <small>
              ~{p.visit_minutes} dk · {PRICE[p.price_level]}
              {p.distance_km !== undefined && <> · {p.distance_km} km</>}
            </small>
            {p.tags?.length > 0 && (
              <>
                <br />
                <small>{p.tags.map((t) => `#${tagName(t)}`).join(' ')}</small>
              </>
            )}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
