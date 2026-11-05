import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false); // ilk /me kontrolü bitti mi?
  const [notice, setNotice] = useState('');

  // Sayfa yenilenince: token varsa sunucuya "ben kimim" diye sor (token'a körü körüne güvenme)
  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return; }
    api.me().then(setUser).catch(() => tokenStore.clear()).finally(() => setReady(true));
  }, []);

  // Sunucu 401 döndürürse (oturum süresi doldu / iptal edildi) kullanıcıyı çıkar
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setNotice('Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.');
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const accept = ({ token, user: u }) => {
    tokenStore.set(token);
    setUser(u);
    setNotice('');
    return u;
  };

  const login = useCallback(async (email, password) => accept(await api.login(email, password)), []);
  const register = useCallback(async (data) => accept(await api.register(data)), []);
  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* oturum zaten bitmiş olabilir */ }
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, notice, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
