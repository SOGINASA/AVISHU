import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import useAuthStore from '../stores/useAuthStore';
import { useTranslation } from 'react-i18next';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login, user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const isOAuth = searchParams.get('oauth') === 'true';

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'client' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Если OAuth и уже есть данные пользователя - предзаполняем форму
  useEffect(() => {
    if (isOAuth && user) {
      setForm(f => ({
        ...f,
        name: user.full_name || '',
        email: user.email || ''
      }));
    }
  }, [isOAuth, user]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isOAuth) {
        // Для OAuth пользователей - обновляем профиль с ролью
        const data = await api.updateProfile({ 
          full_name: form.name, 
          role: form.role,
          onboarding_completed: true 
        });
        login({ 
          access_token: localStorage.getItem('access_token'), 
          refresh_token: localStorage.getItem('refresh_token') 
        }, data.user);
        navigate('/app', { replace: true });
      } else {
        // Для обычных пользователей - создаём новый аккаунт
        const data = await api.register(form.name, form.email, form.password, form.role);
        login({ access_token: data.access_token, refresh_token: data.refresh_token }, data.user);
        navigate('/app', { replace: true });
      }
    } catch (err) {
      setError(err.message);
      // registration failed
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
          <div className="text-[10px] tracking-[0.4em] uppercase text-white/30 mb-6">{t('registerPage.title')}</div>
          <h2 className="text-5xl font-black uppercase leading-none tracking-tight mb-6">
            {t('registerPage.createAccount').split('\n')[0]}<br />{t('registerPage.createAccount').split('\n')[1]}
          </h2>
          <div className="w-8 h-px bg-white/20 mb-8" />

          {/* Steps indicator */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 flex items-center justify-center text-[10px] font-black border border-white text-white">1</div>
              <div>
                <div className="text-xs font-bold tracking-[0.2em] text-white">{t('registerPage.stepData')}</div>
                <div className="text-[10px] text-white/20">{t('registerPage.stepDataSub')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] tracking-[0.3em] uppercase text-white/20">© AVISHU 2024</div>
      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-16">
        <button onClick={() => navigate('/')}
          className="lg:hidden group w-9 h-9 border border-white/12 flex items-center justify-center hover:border-white/35 transition-colors mb-12 self-start">
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M10 4.5H1M1 4.5L4.5 1M1 4.5L4.5 8" stroke="white" strokeWidth="0.85" strokeOpacity="0.45" className="group-hover:stroke-opacity-80 transition-all"/>
          </svg>
        </button>

        <div className="w-full max-w-sm">
          {/* Progress bar */}
          <h1 className="text-2xl font-black uppercase tracking-tight mb-1">
            {t('registerPage.stepData')}
          </h1>
          <p className="text-white/30 text-xs tracking-wide mb-8">
            {t('registerPage.alreadyHave')}{' '}
            <Link to="/login" className="text-white underline underline-offset-4 hover:text-white/60 transition-colors">
              {t('registerPage.login')}
            </Link>
          </p>

          <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">{t('registerPage.name')}</label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Иванова Елена"
                  className="w-full bg-transparent border border-white/15 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-white/50 transition-colors"
                  required />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">{t('registerPage.email')}</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-transparent border border-white/15 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-white/50 transition-colors"
                  required />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">{t('registerPage.password')}</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                    placeholder={t('registerPage.passwordHint')}
                    className="w-full bg-transparent border border-white/15 text-white placeholder-white/20 px-4 py-3 pr-20 text-sm outline-none focus:border-white/50 transition-colors"
                    required minLength={6} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors text-[10px] tracking-widest">
                    {showPass ? t('loginPage.hide').toUpperCase() : t('loginPage.show').toUpperCase()}
                  </button>
                </div>
              </div>
              {error && (
                <div className="border border-white/20 bg-white/5 px-4 py-3 text-xs text-white/70">{error}</div>
              )}
              {error && (
                <div className="border border-white/20 bg-white/5 px-4 py-3 text-xs text-white/70">{error}</div>
              )}
              <div className="pt-2">
                <button type="submit" disabled={loading}
                  className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-4 text-sm hover:bg-white/90 transition-colors disabled:opacity-40">
                  {loading ? '...' : t('registerPage.create')}
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
}
