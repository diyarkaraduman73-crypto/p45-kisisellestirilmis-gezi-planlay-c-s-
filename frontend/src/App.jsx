import { AuthProvider } from './auth/AuthContext.jsx';
import { useRoute } from './hooks/useRoute.js';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import MyTripsPage from './pages/MyTripsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PlannerPage from './pages/PlannerPage.jsx';
import TripDetailPage from './pages/TripDetailPage.jsx';
import SharedTripPage from './pages/SharedTripPage.jsx';

// Sayfa → erişim kuralı tablosu
function Router() {
  const { path } = useRoute();
  // Parametreli sayfalar: #/rota/12, #/paylasim/AbC123
  const [, section, param] = path.split('/');
  if (section === 'rota' && param) {
    return <ProtectedRoute roles={['gezgin', 'yonetici']}><TripDetailPage id={param} /></ProtectedRoute>;
  }
  if (section === 'paylasim' && param) return <SharedTripPage code={param} />; // herkese açık
  switch (path) {
    case '/giris':
      return <LoginPage />;
    case '/kayit':
      return <RegisterPage />;
    case '/rotalarim':
      return <ProtectedRoute roles={['gezgin', 'yonetici']}><MyTripsPage /></ProtectedRoute>;
    case '/planla':
      return <ProtectedRoute roles={['gezgin', 'yonetici']}><PlannerPage /></ProtectedRoute>;
    case '/profil':
      return <ProtectedRoute roles={['gezgin', 'yonetici']}><ProfilePage /></ProtectedRoute>;
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
