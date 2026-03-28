import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import useAuthStore from './stores/useAuthStore';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import ClientPage from './pages/ClientPage';
import FranchiseePage from './pages/FranchiseePage';
import ProductionPage from './pages/ProductionPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

// Маппинг user_type -> страница
const ROLE_ROUTES = {
  client: '/app/client',
  franchisee: '/app/franchisee',
  production: '/app/production',
  admin: '/app/admin',
};

function RoleRouter() {
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  
  // Пока loading, показываем индикатор загрузки
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      </div>
    );
  }
  
  // Если user_type невалидный, редиректим на client
  const targetRoute = ROLE_ROUTES[user.user_type] || '/app/client';
  return <Navigate to={targetRoute} replace />;
}

function AppInit({ children }) {
  const init = useAuthStore(s => s.init);
  const login = useAuthStore(s => s.login);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      init();
    }
  }, [init]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handler = CapApp.addListener('appUrlOpen', async (event) => {
      if (!event.url.startsWith('avishu://oauth/callback')) return;
      await Browser.close();
      const params = new URLSearchParams(event.url.split('?')[1] || '');
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const userJson = params.get('user');
      if (access_token && userJson) {
        try {
          const user = JSON.parse(userJson);
          login({ access_token, refresh_token }, user);
        } catch {}
      }
    });
    return () => { handler.then(h => h.remove()); };
  }, [login]);

  return children;
}

export default function App() {
  return (
    <AppInit>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

          {/* Role-based redirect */}
          <Route path="/app" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />

          {/* Role pages */}
          <Route path="/app/client" element={<ProtectedRoute role="client"><ClientPage /></ProtectedRoute>} />
          <Route path="/app/franchisee" element={<ProtectedRoute role="franchisee"><FranchiseePage /></ProtectedRoute>} />
          <Route path="/app/production" element={<ProtectedRoute role="production"><ProductionPage /></ProtectedRoute>} />
          <Route path="/app/admin" element={<ProtectedRoute role="admin"><AdminPage /></ProtectedRoute>} />

          {/* Legacy dashboard redirect */}
          <Route path="/dashboard" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPage /></ProtectedRoute>} />

          <Route path="/app/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppInit>
  );
}
