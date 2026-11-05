import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { navigate, useRoute } from '../hooks/useRoute.js';

export default function LoginPage() {
  const { login, notice } = useAuth();
  const { query } = useRoute();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      const next = query.get('sonra');
      navigate(next && next.startsWith('/') ? next : '/rotalarim'); // yalnızca uygulama içi yönlendirme
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page narrow">
      <form className="card form" onSubmit={submit}>
        <h1>Giriş yap</h1>
        {notice && <p className="info">{notice}</p>}
        <label>
          E-posta
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Parola
          <input type="password" autoComplete="current-password" required value={password}
                 onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
        <p className="muted">Hesabın yok mu? <a href="#/kayit">Kayıt ol</a></p>
        <p className="hint">Demo: <code>kullanici01@example.com</code> veya <code>yonetici@example.com</code> · parola <code>Deneme1234!</code></p>
      </form>
    </main>
  );
}
