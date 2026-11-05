import { AuthProvider } from './auth/AuthContext.jsx';
import { useRoute } from './hooks/useRoute.js';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import MyTripsPage from './pages/MyTripsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

// Sayfa → erişim kuralı tablosu
function Router() {
  const { path } = useRoute();
  switch (path) {
    case '/giris':
      return <LoginPage />;
    case '/kayit':
      return <RegisterPage />;
    case '/rotalarim':
      return <ProtectedRoute roles={['gezgin', 'yonetici']}><MyTripsPage /></ProtectedRoute>;
    case '/yonetim':
      return <ProtectedRoute roles={['yonetici']}><AdminPage /></ProtectedRoute>;
    default:
      return <HomePage />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <NavBar />
      <Router />
    </AuthProvider>
  );
}
