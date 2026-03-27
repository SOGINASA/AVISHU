import { Navigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuthStore();

  if (loading) {
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

  if (!user) return <Navigate to="/login" replace />;

  if (role && role !== 'admin' && user.user_type !== role && user.user_type !== 'admin') {
    return <Navigate to="/app" replace />;
  }
  if (role === 'admin' && user.user_type !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return children;
}
