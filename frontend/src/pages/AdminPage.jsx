import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../services/api.js';

// Rol: yalnızca yönetici. Buradaki her işlem sunucuda da requireRole('yonetici') ile korunur.
export default function AdminPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [pois, setPois] = useState([]);
  const [interests, setInterests] = useState([]);
  const [poi, setPoi] = useState({ name: '', interest: 'tarih', lat: '', lng: '', visitMinutes: 60 });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.users(), api.pois({ city: 'İstanbul' }), api.interests()])
      .then(([u, p, i]) => { setUsers(u); setPois(p); setInterests(i); })
      .catch((e) => setError(e.message));
  }, []);

  const run = async (fn, okMsg) => {
    setError(''); setMsg('');
    try { await fn(); setMsg(okMsg); } catch (e) { setError(e.message); }
  };

  const changeRole = (u, role) =>
    run(async () => {
      const updated = await api.changeRole(u.id, role);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: updated.role } : x)));
    }, `${u.full_name} artık ${role === 'yonetici' ? 'yönetici' : 'gezgin'}.`);

  const addPoi = (e) => {
    e.preventDefault();
    run(async () => {
      const created = await api.createPoi({ ...poi, city: 'İstanbul', lat: Number(poi.lat), lng: Number(poi.lng), visitMinutes: Number(poi.visitMinutes) });
      setPois((p) => [...p, created]);
      setPoi((f) => ({ ...f, name: '', lat: '', lng: '' }));
    }, 'POI eklendi.');
  };

  const removePoi = (p) =>
    window.confirm(`${p.name} silinsin mi?`) &&
    run(async () => {
      await api.deletePoi(p.id);
      setPois((list) => list.filter((x) => x.id !== p.id));
    }, 'POI silindi.');

  return (
    <main className="page">
      <h1>Yönetim paneli</h1>
      {msg && <p className="info">{msg}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="admin-grid">
        <section className="card">
          <h2>Kullanıcılar <span className="count">{users.length}</span></h2>
          <table className="table">
            <thead><tr><th>Ad</th><th>E-posta</th><th>Rol</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td className="muted">{u.email}</td>
                  <td>
                    <select value={u.role} disabled={u.id === me.id} onChange={(e) => changeRole(u, e.target.value)}
                            aria-label={`${u.full_name} rolü`}>
                      <option value="gezgin">Gezgin</option>
                      <option value="yonetici">Yönetici</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>POI kataloğu <span className="count">{pois.length}</span></h2>
          <form className="form inline-form" onSubmit={addPoi}>
            <input placeholder="Ad" required value={poi.name} onChange={(e) => setPoi({ ...poi, name: e.target.value })} />
            <select value={poi.interest} onChange={(e) => setPoi({ ...poi, interest: e.target.value })}>
              {interests.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
            </select>
            <input placeholder="Enlem" required inputMode="decimal" value={poi.lat} onChange={(e) => setPoi({ ...poi, lat: e.target.value })} />
            <input placeholder="Boylam" required inputMode="decimal" value={poi.lng} onChange={(e) => setPoi({ ...poi, lng: e.target.value })} />
            <button className="primary">Ekle</button>
          </form>
          <ul className="admin-list">
            {pois.map((p) => (
              <li key={p.id}>
                <span>{p.name}</span>
                <button className="ghost danger" onClick={() => removePoi(p)}>Sil</button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
