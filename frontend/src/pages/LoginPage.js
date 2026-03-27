import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import useAuthStore from '../stores/useAuthStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/app', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const e = new URLSearchParams(location.search).get('error');
    if (e) setError(e);
  }, [location.search]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api.login(email, password);
      login({ access_token: data.access_token, refresh_token: data.refresh_token }, data.user);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-[340px]">

          <div className="text-center mb-14">
            <p className="text-[10px] font-semibold tracking-[0.6em] uppercase text-white/20 mb-5">
              Premium Fashion
            </p>
            <h1 className="text-[40px] font-black tracking-[0.15em] uppercase leading-none">AVISHU</h1>
            <div className="w-8 h-px bg-white/20 mx-auto mt-6" />
          </div>

          <form onSubmit={submit}>
            <div className="border border-white/12">
              <div className="border-b border-white/12 px-5 py-4">
                <p className="text-[9px] font-semibold tracking-[0.45em] uppercase text-white/30 mb-2.5">Email</p>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required autoComplete="email"
                  className="w-full bg-transparent text-white text-sm outline-none placeholder-white/18"
                />
              </div>
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[9px] font-semibold tracking-[0.45em] uppercase text-white/30 mb-2.5">Пароль</p>
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="current-password"
                    className="w-full bg-transparent text-white text-sm outline-none placeholder-white/18"
                  />
                </div>
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/22 hover:text-white/55 transition-colors flex-shrink-0 pb-0.5">
                  {showPass ? 'Скрыть' : 'Показать'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400/75 mt-4 px-1">{error}</p>
            )}

            <button type="submit" disabled={busy}
              className="w-full mt-5 bg-white text-black text-xs font-black uppercase tracking-[0.35em] py-5 hover:bg-white/92 active:bg-white/85 transition-colors disabled:opacity-40">
              {busy ? '...' : 'ВОЙТИ'}
            </button>
          </form>

          <p className="text-center mt-8 text-[10px] text-white/25">
            Нет аккаунта?{' '}
            <Link to="/register"
              className="text-white/55 hover:text-white transition-colors underline underline-offset-4 uppercase tracking-wider font-bold">
              Регистрация
            </Link>
          </p>
        </div>
      </div>

      <div className="pb-8 text-center">
        <p className="text-[9px] text-white/10 tracking-[0.35em] uppercase">Казахстан · 2024</p>
      </div>
    </div>
  );
}
