import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import PreferenceForm from '../components/PreferenceForm.jsx';
import PoiMap, { CATEGORY_COLORS } from '../components/PoiMap.jsx';

export default function HomePage() {
  const [interests, setInterests] = useState([]);
  const [pois, setPois] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Render ücretsiz katmanı uykudaysa ilk istek ~1 dk sürebilir.
    Promise.all([api.interests(), api.pois({ city: 'İstanbul' })])
      .then(([i, p]) => { setInterests(i); setPois(p); })
      .catch(() => setError('Sunucuya ulaşılamadı. Sunucu uykudan uyanıyor olabilir, birazdan sayfayı yenileyin.'));
  }, []);

  const handleSubmit = async (prefs) => {
    setLoading(true);
    setError('');
    try {
      setPois(await api.pois({ city: prefs.city, interests: prefs.interests }));
      setSelectedId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const nameOf = (slug) => interests.find((i) => i.slug === slug)?.name || slug;

  return (
    <main className="layout">
      <aside className="sidebar">
        <PreferenceForm interests={interests} onSubmit={handleSubmit} loading={loading} />
        {error && <p className="error" role="alert">{error}</p>}

        <section className="card">
          <h2>POI kataloğu <span className="count">{pois.length}</span></h2>
          <ul className="poi-list">
            {pois.map((p) => (
              <li key={p.id}>
                <button className={selectedId === p.id ? 'active' : ''} onClick={() => setSelectedId(p.id)}>
                  <span className="dot" style={{ background: CATEGORY_COLORS[p.interest] }} />
                  <span className="poi-name">{p.name}</span>
                  <span className="muted">{nameOf(p.interest)} · {p.visit_minutes} dk</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <section className="map-wrap">
        <PoiMap pois={pois} selectedId={selectedId} onSelect={setSelectedId} />
        <p className="map-note">Gün gün rota üretimi sonraki haftalarda eklenecek.</p>
      </section>
    </main>
  );
}
