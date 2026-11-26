import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../services/api.js';
import PoiManager from '../components/PoiManager.jsx';

// Rol: yalnızca yönetici. Buradaki her işlem sunucuda da requireRole('yonetici') ile korunur.
export default function AdminPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [interests, setInterests] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [ai, setAi] = useState(null);

  useEffect(() => { api.aiLogs().then(setAi).catch(() => setAi(null)); }, []);

  useEffect(() => {
    Promise.all([api.users(), api.interests()])
      .then(([u, i]) => { setUsers(u); setInterests(i); })
      .catch((e) => setError(e.message));
  }, []);

  const changeRole = async (u, role) => {
    setError(''); setMsg('');
    try {
      const updated = await api.changeRole(u.id, role);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: updated.role } : x)));
      setMsg(`${u.full_name} artık ${role === 'yonetici' ? 'yönetici' : 'gezgin'}.`);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <main className="page">
      <h1>Yönetim paneli</h1>
      {msg && <p className="info">{msg}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="admin-grid">
        {interests.length > 0 && <PoiManager interests={interests} onMessage={(m) => { setError(''); setMsg(m); }} />}

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

        {ai && (
          <section className="card">
            <h2>Yapay zekâ günlüğü <span className="count">{ai.logs.length}</span></h2>
            <p className="muted small">
              {ai.summary.map((s) => `${s.status}: ${s.adet}${s.ort_sure_ms ? ` (ort. ${s.ort_sure_ms} ms)` : ''}`).join(' · ') || 'Henüz kayıt yok.'}
            </p>
            <table className="table">
              <thead><tr><th>Zaman</th><th>Model / istem</th><th>Durum</th><th>Sorunlar</th></tr></thead>
              <tbody>
                {ai.logs.map((l) => (
                  <tr key={l.id}>
                    <td className="muted">{new Date(l.created_at).toLocaleString('tr-TR')}</td>
                    <td>{l.model ?? '—'}<br /><small className="muted">{l.prompt_version}{l.latency_ms != null ? ` · ${l.latency_ms} ms` : ''}</small></td>
                    <td>{l.status}</td>
                    <td><small>{(l.issues || []).join('; ') || '—'}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
