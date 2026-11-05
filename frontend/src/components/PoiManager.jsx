// Yönetici: POI kataloğu yönetimi (ekle / düzenle / etiketle / pasifleştir / sil)
// Arayüzdeki kontroller yalnızca hızlı geri bildirim içindir; tüm kurallar sunucuda da uygulanır.
import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

const EMPTY = {
  name: '', interest: 'tarih', district: '', address: '', lat: '', lng: '',
  visitMinutes: 60, priceLevel: 0, description: '', tags: [],
};
const MAX_TAGS = 6;

const toForm = (p) => ({
  name: p.name, interest: p.interest, district: p.district || '', address: p.address || '',
  lat: String(p.lat), lng: String(p.lng), visitMinutes: p.visit_minutes, priceLevel: p.price_level,
  description: p.description || '', tags: p.tags || [],
});

export default function PoiManager({ interests, onMessage }) {
  const [pois, setPois] = useState([]);
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    Promise.all([api.pois({ city: 'İstanbul', includeInactive: '1' }), api.tags()])
      .then(([p, t]) => { setPois(p); setTags(t); })
      .catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleTag = (slug) =>
    set('tags', form.tags.includes(slug) ? form.tags.filter((t) => t !== slug)
      : form.tags.length < MAX_TAGS ? [...form.tags, slug] : form.tags);

  const reset = () => { setForm(EMPTY); setEditingId(null); setError(''); };
  const edit = (p) => { setForm(toForm(p)); setEditingId(p.id); setError(''); window.scrollTo?.({ top: 0, behavior: 'smooth' }); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const body = {
      ...form,
      lat: Number(form.lat), lng: Number(form.lng),
      visitMinutes: Number(form.visitMinutes), priceLevel: Number(form.priceLevel),
      district: form.district || undefined, address: form.address || undefined, description: form.description || undefined,
    };
    try {
      if (editingId) {
        await api.updatePoi(editingId, body);
        onMessage(`"${form.name}" güncellendi.`);
      } else {
        await api.createPoi({ ...body, city: 'İstanbul' });
        onMessage(`"${form.name}" eklendi.`);
      }
      reset();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const setActive = async (p, isActive) => {
    try { await api.updatePoi(p.id, { isActive }); onMessage(`"${p.name}" ${isActive ? 'aktifleştirildi' : 'pasifleştirildi'}.`); load(); }
    catch (err) { setError(err.message); }
  };

  const remove = async (p) => {
    if (!window.confirm(`"${p.name}" silinsin mi? Bir gezi planında kullanılıyorsa silinmez, pasifleştirilir.`)) return;
    try {
      const r = await api.deletePoi(p.id);
      onMessage(r?.deactivated
        ? `"${p.name}" ${r.usedInPlans} gezi planında kullanıldığı için silinmedi, pasifleştirildi.`
        : `"${p.name}" silindi.`);
      if (editingId === p.id) reset();
      load();
    } catch (err) { setError(err.message); }
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    try { const t = await api.createTag(newTag.trim()); setNewTag(''); setTags((list) => [...list, t]); onMessage(`#${t.name} etiketi eklendi.`); }
    catch (err) { setError(err.message); }
  };

  const shown = pois.filter((p) => p.name.toLocaleLowerCase('tr').includes(filter.toLocaleLowerCase('tr')));

  return (
    <section className="card">
      <h2>POI kataloğu <span className="count">{pois.length}</span></h2>

      <form className="form poi-form" onSubmit={submit}>
        <h3>{editingId ? `Düzenle: ${pois.find((p) => p.id === editingId)?.name ?? ''}` : 'Yeni POI'}</h3>
        <div className="grid-2">
          <label>Ad<input required minLength={2} maxLength={120} value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label>Kategori
            <select value={form.interest} onChange={(e) => set('interest', e.target.value)}>
              {interests.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
            </select>
          </label>
          <label>Enlem<input required inputMode="decimal" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="41.0086" /></label>
          <label>Boylam<input required inputMode="decimal" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="28.9802" /></label>
          <label>İlçe<input maxLength={80} value={form.district} onChange={(e) => set('district', e.target.value)} /></label>
          <label>Adres<input maxLength={200} value={form.address} onChange={(e) => set('address', e.target.value)} /></label>
          <label>Ziyaret süresi (dk)<input type="number" min="5" max="600" step="5" value={form.visitMinutes} onChange={(e) => set('visitMinutes', e.target.value)} /></label>
          <label>Fiyat
            <select value={form.priceLevel} onChange={(e) => set('priceLevel', e.target.value)}>
              {['Ücretsiz', '₺', '₺₺', '₺₺₺'].map((l, i) => <option key={i} value={i}>{l}</option>)}
            </select>
          </label>
        </div>
        <label>Açıklama<textarea rows="2" maxLength={1000} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
        <fieldset>
          <legend>Etiketler <span className="muted">({form.tags.length}/{MAX_TAGS})</span></legend>
          <div className="chips">
            {tags.map((t) => (
              <button type="button" key={t.slug} className={`chip small ${form.tags.includes(t.slug) ? 'active' : ''}`}
                      aria-pressed={form.tags.includes(t.slug)} onClick={() => toggleTag(t.slug)}>
                #{t.name}
              </button>
            ))}
          </div>
          <div className="row tag-add">
            <input placeholder="Yeni etiket" value={newTag} onChange={(e) => setNewTag(e.target.value)} maxLength={60} />
            <button type="button" className="ghost" onClick={addTag}>Etiket ekle</button>
          </div>
        </fieldset>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          <button className="primary">{editingId ? 'Kaydet' : 'Ekle'}</button>
          {editingId && <button type="button" className="ghost" onClick={reset}>Vazgeç</button>}
        </div>
      </form>

      <input className="list-filter" type="search" placeholder="Listede ara" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ul className="admin-list">
        {shown.map((p) => (
          <li key={p.id} className={p.is_active ? '' : 'inactive'}>
            <span>
              {p.name} {!p.is_active && <span className="badge">pasif</span>}
              <br /><small className="muted">{p.district || '—'} · {p.tags.length} etiket</small>
            </span>
            <span className="row">
              <button className="ghost" onClick={() => edit(p)}>Düzenle</button>
              {p.is_active
                ? <button className="ghost" onClick={() => setActive(p, false)}>Pasifleştir</button>
                : <button className="ghost" onClick={() => setActive(p, true)}>Aktifleştir</button>}
              <button className="ghost danger" onClick={() => remove(p)}>Sil</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
