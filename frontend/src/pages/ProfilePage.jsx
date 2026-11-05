import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { navigate } from '../hooks/useRoute.js';

const BUDGETS = [
  { id: 'dusuk', label: 'Ekonomik', hint: 'ücretsiz ve ₺' },
  { id: 'orta', label: 'Orta', hint: '₺₺\'ye kadar' },
  { id: 'yuksek', label: 'Rahat', hint: 'hepsi' },
];
const PACES = [
  { id: 'sakin', label: 'Sakin' },
  { id: 'normal', label: 'Normal' },
  { id: 'yogun', label: 'Yoğun' },
];
const LEVEL = ['', 'Biraz', 'Az', 'Orta', 'Çok', 'Tutkulu'];

// İlgi Profili: kullanıcı yalnızca kendi profilini görür/düzenler (sunucu /api/profile = "ben")
export default function ProfilePage() {
  const [all, setAll] = useState([]);
  const [weights, setWeights] = useState({}); // { tarih: 4, doga: 2 }  (seçili olmayan = yok)
  const [budget, setBudget] = useState('orta');
  const [pace, setPace] = useState('normal');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.interests(), api.profile()])
      .then(([i, p]) => {
        setAll(i);
        setWeights(Object.fromEntries(p.interests.map((x) => [x.slug, x.weight])));
        setBudget(p.budget);
        setPace(p.pace);
      })
      .catch((e) => setError(e.message));
  }, []);

  const toggle = (slug) =>
    setWeights((w) => {
      const next = { ...w };
      if (slug in next) delete next[slug]; else next[slug] = 3;
      return next;
    });

  const selected = Object.keys(weights);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(''); setError('');
    try {
      await api.saveProfile({
        budget,
        pace,
        interests: selected.map((slug) => ({ slug, weight: weights[slug] })),
      });
      setMsg('Profilin kaydedildi.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page narrow-md">
      <h1>İlgi profilim</h1>
      <form className="card form" onSubmit={save}>
        <fieldset>
          <legend>İlgi alanların ve ilgi düzeyin</legend>
          <ul className="interest-list">
            {all.map((i) => {
              const on = i.slug in weights;
              return (
                <li key={i.slug} className={on ? 'on' : ''}>
                  <label className="check">
                    <input type="checkbox" checked={on} onChange={() => toggle(i.slug)} />
                    {i.name}
                  </label>
                  {on && (
                    <span className="weight">
                      <input type="range" min="1" max="5" step="1" value={weights[i.slug]}
                             aria-label={`${i.name} ilgi düzeyi`}
                             onChange={(e) => setWeights((w) => ({ ...w, [i.slug]: Number(e.target.value) }))} />
                      <span className="muted">{LEVEL[weights[i.slug]]}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {selected.length === 0 && <p className="hint">En az bir ilgi alanı seç.</p>}
        </fieldset>

        <fieldset>
          <legend>Bütçe</legend>
          <div className="segmented">
            {BUDGETS.map((b) => (
              <button type="button" key={b.id} className={budget === b.id ? 'active' : ''} onClick={() => setBudget(b.id)} title={b.hint}>
                {b.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Gezi temposu</legend>
          <div className="segmented">
            {PACES.map((p) => (
              <button type="button" key={p.id} className={pace === p.id ? 'active' : ''} onClick={() => setPace(p.id)}>{p.label}</button>
            ))}
          </div>
        </fieldset>

        {msg && <p className="info">{msg} <button type="button" className="link-btn" onClick={() => navigate('/')}>Sana uygun yerleri gör →</button></p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy || selected.length === 0}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </form>
    </main>
  );
}
