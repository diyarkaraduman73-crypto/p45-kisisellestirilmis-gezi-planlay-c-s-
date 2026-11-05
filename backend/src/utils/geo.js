// Konum hesapları (PostGIS gerektirmeden).
const R = 6371; // Dünya yarıçapı, km
const rad = (d) => (d * Math.PI) / 180;

// İki nokta arası kuş uçuşu mesafe (Haversine formülü), km
export function distanceKm(lat1, lng1, lat2, lng2) {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Yarıçap aramasında indeksli ön filtre için merkez etrafındaki kutu.
// (Önce ucuz "lat/lng aralıkta mı" kontrolü indeksle yapılır, sonra kesin mesafe hesaplanır.)
export function boundingBox(lat, lng, radiusKm) {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos(rad(lat)));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

// SQL içinde aynı Haversine formülü ($lat, $lng parametre numaraları verilir)
export const sqlDistanceKm = (latParam, lngParam) => `(
  2 * ${R} * asin(sqrt(
    power(sin(radians(p.lat - ${latParam}) / 2), 2) +
    cos(radians(${latParam})) * cos(radians(p.lat)) * power(sin(radians(p.lng - ${lngParam}) / 2), 2)
  )))`;
