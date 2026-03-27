import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import useAuthStore from './stores/useAuthStore';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import ClientPage from './pages/ClientPage';
import FranchiseePage from './pages/FranchiseePage';
import ProductionPage from './pages/ProductionPage';
import AdminPage from './pages/AdminPage';

function RoleRouter() {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  switch (user.user_type) {
    case 'client': return <Navigate to="/app/client" replace />;
    case 'franchisee': return <Navigate to="/app/franchisee" replace />;
    case 'production': return <Navigate to="/app/production" replace />;
    case 'admin': return <Navigate to="/app/admin" replace />;
    default: return <Navigate to="/app/client" replace />;
  }
}

function AppInit({ children }) {
  const init = useAuthStore(s => s.init);
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    // Only run init once on mount, not on every re-render
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      init();
    }
  }, [init]);
  
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppInit>
  );
}
