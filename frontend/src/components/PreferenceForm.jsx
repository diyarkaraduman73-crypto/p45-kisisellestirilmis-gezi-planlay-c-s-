import { useState } from 'react';

const BUDGETS = [
  { id: 'dusuk', label: 'Ekonomik' },
  { id: 'orta', label: 'Orta' },
  { id: 'yuksek', label: 'Rahat' },
];
const PACES = [
  { id: 'sakin', label: 'Sakin' },
  { id: 'normal', label: 'Normal' },
  { id: 'yogun', label: 'Yoğun' },
];

export default function PreferenceForm({ interests, onSubmit, loading }) {
  const [form, setForm] = useState({
    name: '',
    city: 'İstanbul',
    days: 2,
    interests: [],
    budget: 'orta',
    pace: 'normal',
  });

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleInterest = (id) =>
    set('interests', form.interests.includes(id) ? form.interests.filter((i) => i !== id) : [...form.interests, id]);

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, days: Number(form.days) });
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>İlgi / tercih profilin</h2>

      <label>
        Adın <span className="muted">(isteğe bağlı)</span>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Örn. Diyar" />
      </label>

      <div className="row">
        <label>
          Şehir
          <select value={form.city} onChange={(e) => set('city', e.target.value)}>
            <option>İstanbul</option>
          </select>
        </label>
        <label>
          Kaç gün?
          <input type="number" min="1" max="14" value={form.days} onChange={(e) => set('days', e.target.value)} />
        </label>
      </div>

      <fieldset>
        <legend>İlgi alanların</legend>
        <div className="chips">
          {interests.map((c) => (
            <button
              type="button"
              key={c.slug}
              className={`chip ${form.interests.includes(c.slug) ? 'active' : ''}`}
              aria-pressed={form.interests.includes(c.slug)}
              onClick={() => toggleInterest(c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Bütçe</legend>
        <div className="segmented">
          {BUDGETS.map((b) => (
            <button type="button" key={b.id} className={form.budget === b.id ? 'active' : ''} onClick={() => set('budget', b.id)}>
              {b.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Tempo</legend>
        <div className="segmented">
          {PACES.map((p) => (
            <button type="button" key={p.id} className={form.pace === p.id ? 'active' : ''} onClick={() => set('pace', p.id)}>
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button className="primary" type="submit" disabled={loading || form.interests.length === 0}>
        {loading ? 'Yükleniyor…' : 'Yerleri göster'}
      </button>
      {form.interests.length === 0 && <p className="hint">En az bir ilgi alanı seç.</p>}
    </form>
  );
}
