// Rota ve gün planı üretimi: ayarlar → önizleme → kaydet
import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { navigate } from '../hooks/useRoute.js';
import TripView from '../components/TripView.jsx';

const PACES = [
  { id: 'sakin', label: 'Sakin', hint: 'günde en fazla 3 yer, 12 km' },
  { id: 'normal', label: 'Normal', hint: 'günde en fazla 5 yer, 20 km' },
  { id: 'yogun', label: 'Yoğun', hint: 'günde en fazla 7 yer, 30 km' },
];
const START = [
  { id: 'yok', label: 'İlk duraktan başla' },
  { id: 'konum', label: '📍 Konumumdan' },
  { id: 'poi', label: 'Bir yerden' },
];

export default function PlannerPage() {
  const [profile, setProfile] = useState(null);
  const [pois, setPois] = useState([]);
  const [f, setF] = useState({ days: 2, pace: '', dayStart: '09:00', dayEnd: '19:00', startDate: '', mustInclude: [], exclude: [] });
  const [startMode, setStartMode] = useState('yok');
  const [startPoint, setStartPoint] = useState(null);
  const [startPoi, setStartPoi] = useState('');
  const [plan, setPlan] = useState(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.profile(), api.pois({ city: 'İstanbul' })])
      .then(([p, list]) => { setProfile(p); setPois(list); setF((x) => ({ ...x, pace: p.pace })); })
      .catch((e) => setError(e.message));
  }, []);

  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setPlan(null); };
  const toggleList = (k, id) => set(k, f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id]);

  const chooseStart = (mode) => {
    setStartMode(mode); setPlan(null); setStartPoint(null);
    if (mode === 'konum') {
      if (!navigator.geolocation) return setError('Tarayıcınız konum özelliğini desteklemiyor.');
      navigator.geolocation.getCurrentPosition(
        (pos) => setStartPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { setError('Konum izni verilmedi.'); setStartMode('yok'); }
      );
    }
  };

  const params = () => {
    let start = null;
    if (startMode === 'konum') start = startPoint;
    if (startMode === 'poi' && startPoi) {
      const p = pois.find((x) => x.id === Number(startPoi));
      if (p) start = { lat: p.lat, lng: p.lng };
    }
    return { city: 'İstanbul', ...f, days: Number(f.days), start, startDate: f.startDate || undefined };
  };

  const preview = async (e) => {
    e?.preventDefault();
    setBusy(true); setError('');
    try {
      const p = await api.planTrip(params());
      setPlan(p);
      if (!title) setTitle(`İstanbul · ${p.params.days} gün`);
    } catch (err) {
      setError(err.message);
      setPlan(null);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true); setError('');
    try {
      // Sunucu planı aynı parametrelerle yeniden üretir; ekrandaki plan gönderilmez.
      const r = await api.generateTrip({ ...params(), title });
      navigate(`/rota/${r.trip.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (profile && profile.interests.length === 0) {
    return (
      <main className="page narrow">
        <section className="card">
          <h1>Önce ilgi profilin</h1>
          <p>Rota, ilgi alanlarına göre üretilir. Profilinde en az bir ilgi alanı seç.</p>
          <a className="primary as-link" href="#/profil">Profilime git</a>
        </section>
      </main>
    );
  }

  const settings = (
    <form className="card form planner-form" onSubmit={preview}>
      <h1>Rota planla</h1>
      {profile && (
        <p className="muted">
          İlgilerin: {profile.interests.map((i) => `${i.name} ${i.weight}/5`).join(', ')} · <a href="#/profil">değiştir</a>
        </p>
      )}
      <div className="grid-2">
        <label>Kaç gün?
          <input type="number" min="1" max="7" value={f.days} onChange={(e) => set('days', e.target.value)} />
        </label>
        <label>Başlangıç tarihi <span className="muted">(isteğe bağlı)</span>
          <input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </label>
        <label>Gün başlangıcı
          <input type="time" value={f.dayStart} onChange={(e) => set('dayStart', e.target.value)} />
        </label>
        <label>Gün bitişi
          <input type="time" value={f.dayEnd} onChange={(e) => set('dayEnd', e.target.value)} />
        </label>
      </div>

      <fieldset>
        <legend>Tempo</legend>
        <div className="segmented">
          {PACES.map((p) => (
            <button type="button" key={p.id} title={p.hint} className={f.pace === p.id ? 'active' : ''} onClick={() => set('pace', p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <small className="muted">{PACES.find((p) => p.id === f.pace)?.hint}</small>
      </fieldset>

      <fieldset>
        <legend>Her gün nereden başlıyorsun?</legend>
        <div className="segmented">
          {START.map((s) => (
            <button type="button" key={s.id} className={startMode === s.id ? 'active' : ''} onClick={() => chooseStart(s.id)}>{s.label}</button>
          ))}
        </div>
        {startMode === 'poi' && (
          <select value={startPoi} onChange={(e) => { setStartPoi(e.target.value); setPlan(null); }}>
            <option value="">Bir yer seç…</option>
            {pois.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </fieldset>

      <details>
        <summary>Mutlaka görmek istediğim / istemediğim yerler ({f.mustInclude.length} / {f.exclude.length})</summary>
        <ul className="pick-list">
          {pois.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <span className="row">
                <button type="button" className={`chip small ${f.mustInclude.includes(p.id) ? 'active' : ''}`}
                        onClick={() => { if (f.exclude.includes(p.id)) toggleList('exclude', p.id); toggleList('mustInclude', p.id); }}>
                  ✓ mutlaka
                </button>
                <button type="button" className={`chip small ${f.exclude.includes(p.id) ? 'active dark' : ''}`}
                        onClick={() => { if (f.mustInclude.includes(p.id)) toggleList('mustInclude', p.id); toggleList('exclude', p.id); }}>
                  ✕ istemiyorum
                </button>
              </span>
            </li>
          ))}
        </ul>
      </details>

      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={busy || !profile || (startMode === 'konum' && !startPoint)}>
        {busy && !plan ? 'Plan üretiliyor…' : plan ? 'Yeniden üret' : 'Plan üret'}
      </button>
    </form>
  );

  if (!plan) return <main className="page">{settings}</main>;

  return (
    <main className="planner-result">
      <TripView
        days={plan.days}
        start={plan.params.start}
        totals={plan.totals}
        header={
          <>
            <button className="link-btn back" onClick={() => setPlan(null)}>← Ayarlara dön</button>
            {plan.warnings.map((w) => <p key={w} className="warn">{w}</p>)}
            {plan.unplaced.length > 0 && (
              <p className="warn">Sığmayan zorunlu yerler: {plan.unplaced.map((u) => u.name).join(', ')}</p>
            )}
            <div className="save-row">
              <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Rota adı" aria-label="Rota adı" />
              <button className="primary" disabled={busy || !title.trim() || plan.totals.stops === 0} onClick={save}>
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
            {error && <p className="error" role="alert">{error}</p>}
          </>
        }
      />
    </main>
  );
}
