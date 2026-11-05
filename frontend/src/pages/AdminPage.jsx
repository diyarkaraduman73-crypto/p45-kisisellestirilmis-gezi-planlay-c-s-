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
      </div>
    </main>
  );
}
