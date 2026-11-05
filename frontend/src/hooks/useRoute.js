// Ek paket gerektirmeyen basit hash yönlendirici: #/giris, #/rotalarim ...
// (Hash kullanıldığı için statik barındırmada sayfa yenilense de 404 olmaz.)
import { useEffect, useState } from 'react';

const current = () => window.location.hash.replace(/^#/, '') || '/';

export function navigate(path) {
  window.location.hash = path;
}

export function useRoute() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const onChange = () => setPath(current());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const [pathname, query = ''] = path.split('?');
  return { path: pathname, query: new URLSearchParams(query) };
}
