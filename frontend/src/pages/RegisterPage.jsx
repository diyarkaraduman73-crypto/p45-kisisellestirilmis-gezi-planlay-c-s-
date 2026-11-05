import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../services/api.js';
import { navigate } from '../hooks/useRoute.js';

// İstemci tarafı kontrol yalnızca hızlı geri bildirim içindir; aynı kural sunucuda da uygulanır.
function passwordHint(p) {
  if (p.length < 8) return 'En az 8 karakter';
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p) || !/\d/.test(p)) return 'En az bir harf ve bir rakam';
  return '';
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [interests, setInterests] = useState([]);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', password2: '', interests: [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.interests().then(setInterests).catch(() => {}); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (slug) =>
    set('interests', form.interests.includes(slug) ? form.interests.filter((s) => s !== slug) : [...form.interests, slug]);

  const hint = form.password ? passwordHint(form.password) : '';
  const mismatch = form.password2 && form.password !== form.password2;

  const submit = async (e) => {
    e.preventDefault();
    if (hint || mismatch) return;
    setBusy(true);
    setError('');
    try {
      await register({ fullName: form.fullName, email: form.email, password: form.password, interests: form.interests });
      navigate('/rotalarim');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page narrow">
      <form className="card form" onSubmit={submit}>
        <h1>Kayıt ol</h1>
        <label>
          Ad soyad
          <input autoComplete="name" required maxLength={100} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </label>
        <label>
          E-posta
          <input type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
        </label>
        <label>
          Parola
          <input type="password" autoComplete="new-password" required value={form.password}
                 onChange={(e) => set('password', e.target.value)} />
          {hint && <span className="hint">{hint}</span>}
        </label>
        <label>
          Parola (tekrar)
          <input type="password" autoComplete="new-password" required value={form.password2}
                 onChange={(e) => set('password2', e.target.value)} />
          {mismatch && <span className="hint">Parolalar eşleşmiyor</span>}
        </label>
        <fieldset>
          <legend>İlgi alanların <span className="muted">(isteğe bağlı)</span></legend>
          <div className="chips">
            {interests.map((i) => (
              <button type="button" key={i.slug} className={`chip ${form.interests.includes(i.slug) ? 'active' : ''}`}
                      aria-pressed={form.interests.includes(i.slug)} onClick={() => toggle(i.slug)}>
                {i.name}
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy || !!hint || mismatch}>{busy ? 'Kaydediliyor…' : 'Kayıt ol'}</button>
        <p className="muted">Zaten hesabın var mı? <a href="#/giris">Giriş yap</a></p>
      </form>
    </main>
  );
}
