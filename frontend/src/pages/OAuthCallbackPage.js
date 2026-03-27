import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const userJson = params.get('user');
    const error = params.get('error');

    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }

    if (access_token && userJson) {
      try {
        const user = JSON.parse(userJson);
        
        // Сохраняем токены и данные пользователя
        login({ access_token, refresh_token }, user);
        
        // Если onboarding не завершён - отправляем на регистрацию для выбора роли
        if (!user.onboarding_completed) {
          // Передаём OAuth данные в RegisterPage
          navigate('/register?oauth=true', { replace: true });
          return;
        }
        
        // Если onboarding завершён - отправляем на свою страницу
        navigate('/app', { replace: true });
      } catch {
        navigate('/login', { replace: true });
      }
    } else {
      navigate('/login', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 bg-white rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <div className="text-[10px] tracking-[0.4em] uppercase text-white/30">АВТОРИЗАЦИЯ...</div>
    </div>
  );
}
