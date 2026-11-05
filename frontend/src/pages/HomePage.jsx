import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import PoiMap, { CATEGORY_COLORS } from '../components/PoiMap.jsx';

const EMPTY = { q: '', interests: [], tags: [], priceMax: '', radiusKm: '3' };
// Konum alınamazsa (izin verilmedi / desteklenmiyor) şehir merkezi kullanılmaz; kullanıcıya söylenir.

export default function HomePage() {
  const { user } = useAuth();
  const [interests, setInterests] = useState([]);
  const [tags, setTags] = useState([]);
  const [filters, setFilters] = useState(EMPTY);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [forMe, setForMe] = useState(false);
  const [pois, setPois] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Render ücretsiz katmanı uykudaysa ilk istek ~1 dk sürebilir.
    Promise.all([api.interests(), api.tags()])
      .then(([i, t]) => { setInterests(i); setTags(t); })
      .catch(() => setError('Sunucuya ulaşılamadı. Sunucu uykudan uyanıyor olabilir, birazdan sayfayı yenileyin.'));
  }, []);

  useEffect(() => { if (!user) setForMe(false); }, [user]);

  // Filtre değişince yeniden yükle (aramada yazarken her harfte istek atmamak için kısa gecikme)
  useEffect(() => {
    const geo = location ? { lat: location.lat, lng: location.lng } : {};
    const t = setTimeout(() => {
      setLoading(true);
      setError('');
      const req = forMe
        ? api.poisForMe({ city: 'İstanbul', ...geo })
        : api.pois({ city: 'İstanbul', ...filters, ...geo, radiusKm: location ? filters.radiusKm : undefined });
      req.then(setPois).catch((e) => setError(e.message)).finally(() => setLoading(false));
    }, filters.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [filters, location, forMe]);

  const locate = () => {
    if (!navigator.geolocation) return setError('Tarayıcınız konum özelliğini desteklemiyor.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) }); setLocating(false); },
      () => { setError('Konum izni verilmedi. Yakınlık araması için tarayıcıdan izin verin.'); setLocating(false); },
      { timeout: 10000 }
    );
  };

  const nameOf = (slug) => interests.find((i) => i.slug === slug)?.name || slug;
  const tagName = (slug) => tags.find((t) => t.slug === slug)?.name || slug;
  const hasFilter = filters.q || filters.interests.length || filters.tags.length || filters.priceMax || location;

  return (
    <main className="layout">
      <aside className="sidebar">
        <FilterPanel
          interests={interests} tags={tags} filters={filters} onChange={setFilters}
          onLocate={locate} locating={locating} location={location}
          forMe={forMe} onForMe={setForMe} canForMe={!!user}
        />
        {error && <p className="error" role="alert">{error}</p>}

        <section className="card">
          <h2>
            {forMe ? 'Sana uygun yerler' : 'POI kataloğu'} <span className="count">{pois.length}</span>
            {hasFilter && !forMe && (
              <button className="link-btn" onClick={() => { setFilters(EMPTY); setLocation(null); }}>Temizle</button>
            )}
          </h2>
          {loading && <p className="muted">Yükleniyor…</p>}
          {!loading && pois.length === 0 && <p className="muted">Bu filtrelere uyan yer yok.</p>}
          <ul className="poi-list">
            {pois.map((p) => (
              <li key={p.id}>
                <button className={selectedId === p.id ? 'active' : ''} onClick={() => setSelectedId(p.id)}>
                  <span className="dot" style={{ background: CATEGORY_COLORS[p.interest] }} />
                  <span className="poi-name">
                    {p.name}
                    {p.score !== undefined && <span className="score">{p.score}</span>}
                  </span>
                  <span className="muted">
                    {nameOf(p.interest)}{p.district ? ` · ${p.district}` : ''} · {p.visit_minutes} dk
                    {p.distance_km !== undefined ? ` · ${p.distance_km} km` : ''}
                  </span>
                  {p.reasons && <span className="reasons">{p.reasons.join(' · ')}</span>}
                  {!p.reasons && p.tags?.length > 0 && (
                    <span className="tag-row">{p.tags.map((t) => <span key={t} className="tag">#{tagName(t)}</span>)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <section className="map-wrap">
        <PoiMap pois={pois} selectedId={selectedId} onSelect={setSelectedId} userLocation={location} tagName={tagName} />
      </section>
    </main>
  );
}
