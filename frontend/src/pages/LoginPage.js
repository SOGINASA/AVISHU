import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import useAuthStore from '../stores/useAuthStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/app', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const err = params.get('error');
    if (err) setError(err);
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(form.email, form.password);
      login({ access_token: data.access_token, refresh_token: data.refresh_token }, data.user);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">

      {/* LEFT — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 border-r border-white/10">
        <button onClick={() => navigate('/')} className="text-xs tracking-[0.3em] uppercase text-white/40 hover:text-white transition-colors w-fit">
          ← AVISHU
        </button>

        <div>
          <div className="text-[10px] tracking-[0.4em] uppercase text-white/30 mb-6">АВТОРИЗАЦИЯ</div>
          <h2 className="text-5xl font-black uppercase leading-none tracking-tight mb-6">
            ВОЙТИ<br />В СИСТЕМУ
          </h2>
          <div className="w-8 h-px bg-white/20 mb-6" />
          <p className="text-white/30 text-sm leading-relaxed max-w-xs">
            Единая точка входа для клиентов, франчайзи и производства.
          </p>
        </div>

        <div className="text-[10px] tracking-[0.3em] uppercase text-white/20">© AVISHU 2024</div>
      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-16">
        <button onClick={() => navigate('/')} className="lg:hidden text-xs tracking-[0.3em] uppercase text-white/40 mb-12">
          AVISHU
        </button>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-black uppercase tracking-tight mb-1">ВХОД</h1>
          <p className="text-white/30 text-xs tracking-wide mb-8">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-white underline underline-offset-4 hover:text-white/60 transition-colors">
              РЕГИСТРАЦИЯ
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">EMAIL</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full bg-transparent border border-white/15 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-white/50 transition-colors"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">ПАРОЛЬ</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-transparent border border-white/15 text-white placeholder-white/20 px-4 py-3 pr-12 text-sm outline-none focus:border-white/50 transition-colors"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors text-xs">
                  {showPass ? 'СКРЫТЬ' : 'ПОКАЗАТЬ'}
                </button>
              </div>
            </div>

            {error && (
              <div className="border border-white/20 bg-white/5 px-4 py-3 text-xs text-white/70">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-4 text-sm hover:bg-white/90 transition-colors disabled:opacity-40"
              >
                {loading ? '...' : 'ВОЙТИ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
