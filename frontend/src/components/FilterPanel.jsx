// Keşfet sayfasının filtre paneli: kategori, etiket, ad araması, fiyat, konum
const PRICE = [
  { v: '', label: 'Hepsi' },
  { v: '0', label: 'Ücretsiz' },
  { v: '1', label: '≤ ₺' },
  { v: '2', label: '≤ ₺₺' },
];

export default function FilterPanel({ interests, tags, filters, onChange, onLocate, locating, location, forMe, onForMe, canForMe }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });
  const toggle = (k, slug) =>
    set(k, filters[k].includes(slug) ? filters[k].filter((s) => s !== slug) : [...filters[k], slug]);

  return (
    <section className="card form">
      <h2>Keşfet</h2>

      {canForMe && (
        <label className="switch">
          <input type="checkbox" checked={forMe} onChange={(e) => onForMe(e.target.checked)} />
          <span>İlgi profilime göre sırala</span>
        </label>
      )}

      <label>
        Ada göre ara
        <input type="search" placeholder="Örn. Gal" value={filters.q} onChange={(e) => set('q', e.target.value)} disabled={forMe} />
      </label>

      <fieldset disabled={forMe}>
        <legend>Kategori</legend>
        <div className="chips">
          {interests.map((i) => (
            <button type="button" key={i.slug} className={`chip ${filters.interests.includes(i.slug) ? 'active' : ''}`}
                    aria-pressed={filters.interests.includes(i.slug)} onClick={() => toggle('interests', i.slug)}>
              {i.name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={forMe}>
        <legend>Etiket <span className="muted">(hepsini taşıyanlar)</span></legend>
        <div className="chips">
          {tags.map((t) => (
            <button type="button" key={t.slug} className={`chip small ${filters.tags.includes(t.slug) ? 'active' : ''}`}
                    aria-pressed={filters.tags.includes(t.slug)} onClick={() => toggle('tags', t.slug)}>
              #{t.name} <span className="muted">{t.poi_count}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={forMe}>
        <legend>Fiyat</legend>
        <div className="segmented">
          {PRICE.map((p) => (
            <button type="button" key={p.v} className={filters.priceMax === p.v ? 'active' : ''} onClick={() => set('priceMax', p.v)}>
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Konum</legend>
        <div className="row">
          <button type="button" className="ghost" onClick={onLocate} disabled={locating}>
            {locating ? 'Konum alınıyor…' : location ? '📍 Konumum alındı' : '📍 Yakınımdakiler'}
          </button>
          {location && (
            <select value={filters.radiusKm} onChange={(e) => set('radiusKm', e.target.value)} aria-label="Yarıçap" disabled={forMe}>
              {['1', '3', '5', '10', '25'].map((r) => <option key={r} value={r}>{r} km</option>)}
            </select>
          )}
        </div>
      </fieldset>
    </section>
  );
}
