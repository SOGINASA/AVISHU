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

  const ROLES = [
    { id: 'client', label: t('registerPage.roles.client'), desc: t('registerPage.roles.clientDesc') },
    { id: 'franchisee', label: t('registerPage.roles.franchisee'), desc: t('registerPage.roles.franchiseeDesc') },
    { id: 'production', label: t('registerPage.roles.production'), desc: t('registerPage.roles.productionDesc') },
  ];
  
  const [step, setStep] = useState(isOAuth ? 2 : 1);
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

  const next = (e) => { e.preventDefault(); setStep(2); };

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
      if (!isOAuth) setStep(1);
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
            {[
              { n: 1, label: t('registerPage.stepData'), sub: t('registerPage.stepDataSub') },
              { n: 2, label: t('registerPage.stepRole'), sub: t('registerPage.stepRoleSub') },
            ].map(({ n, label, sub }) => (
              <div key={n} className="flex items-center gap-4">
                <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-black border flex-shrink-0 transition-colors ${step >= n ? 'border-white text-white' : 'border-white/20 text-white/20'}`}>
                  {step > n ? '✓' : n}
                </div>
                <div>
                  <div className={`text-xs font-bold tracking-[0.2em] transition-colors ${step >= n ? 'text-white' : 'text-white/20'}`}>{label}</div>
                  <div className="text-[10px] text-white/20">{sub}</div>
                </div>
              </div>
            ))}
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
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px bg-white/10 overflow-hidden">
              <div className="h-full bg-white transition-all duration-300" style={{ width: step === 1 ? '50%' : '100%' }} />
            </div>
            <span className="text-[10px] tracking-[0.2em] text-white/30">{step}/2</span>
          </div>

          <h1 className="text-2xl font-black uppercase tracking-tight mb-1">
            {step === 1 ? t('registerPage.stepData') : t('registerPage.yourRole')}
          </h1>
          <p className="text-white/30 text-xs tracking-wide mb-8">
            {t('registerPage.alreadyHave')}{' '}
            <Link to="/login" className="text-white underline underline-offset-4 hover:text-white/60 transition-colors">
              {t('registerPage.login')}
            </Link>
          </p>

          {step === 1 && (
            <form onSubmit={next} className="space-y-4">
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
              <div className="pt-2">
                <button type="submit"
                  className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-4 text-sm hover:bg-white/90 transition-colors">
                  {t('registerPage.next')}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={submit} className="space-y-3">
              {ROLES.map(r => (
                <button key={r.id} type="button" onClick={() => set('role', r.id)}
                  className={`w-full text-left px-5 py-4 border transition-colors ${form.role === r.id ? 'border-white bg-white/5' : 'border-white/15 hover:border-white/30'}`}>
                  <div className={`text-xs font-black uppercase tracking-[0.2em] mb-0.5 ${form.role === r.id ? 'text-white' : 'text-white/60'}`}>
                    {r.label}
                  </div>
                  <div className="text-[11px] text-white/30">{r.desc}</div>
                </button>
              ))}

              {error && (
                <div className="border border-white/20 bg-white/5 px-4 py-3 text-xs text-white/70">{error}</div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setStep(1)}
                  className="px-6 py-4 border border-white/15 text-white/40 text-xs uppercase tracking-widest hover:border-white/30 hover:text-white/70 transition-colors">
                  {t('registerPage.back')}
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-white text-black font-black uppercase tracking-[0.2em] py-4 text-sm hover:bg-white/90 transition-colors disabled:opacity-40">
                  {loading ? '...' : t('registerPage.create')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
