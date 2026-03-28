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
  const [biometricLoading, setBiometricLoading] = useState(false);

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

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const data = await api.oauthStart('google');
      window.location.href = data.redirect_url;
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBiometricLogin = async () => {
    if (!email.trim()) {
      setError('Введите email для биометрической аутентификации');
      return;
    }
    setError('');
    setBiometricLoading(true);
    try {
      const optionsData = await api.webauthn.authenticateOptions(email);
      const options = {
        ...optionsData,
        challenge: Uint8Array.from(atob(optionsData.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
        allowCredentials: optionsData.allowCredentials.map(cred => ({
          ...cred,
          id: Uint8Array.from(atob(cred.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
        })),
      };
      const credential = await navigator.credentials.get({ publicKey: options });
      const credentialData = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        type: credential.type,
        response: {
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
          signature: btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
          userHandle: credential.response.userHandle
            ? btoa(String.fromCharCode(...new Uint8Array(credential.response.userHandle)))
            : null,
        },
      };
      const authData = await api.webauthn.authenticate(email, credentialData);
      login({ access_token: authData.access_token, refresh_token: authData.refresh_token }, authData.user);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.message.includes('not found') || err.message.includes('NotFoundError')
        ? 'Биометрические данные не найдены для этого пользователя'
        : err.message);
    } finally {
      setBiometricLoading(false);
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

          {/* Alternative Login Methods */}
          <div className="mt-10 pt-8 border-t border-white/10">
            <p className="text-center text-[9px] font-semibold tracking-[0.45em] uppercase text-white/30 mb-5">
              или войти через
            </p>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 border border-white/15 hover:border-white/30 hover:bg-white/5 transition-all mb-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Google</span>
            </button>

            {/* Biometric Login Button */}
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 border border-white/15 hover:border-white/30 hover:bg-white/5 transition-all disabled:opacity-40"
            >
              <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                {biometricLoading ? '...' : 'Биометрия'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="pb-8 text-center">
        <p className="text-[9px] text-white/10 tracking-[0.35em] uppercase">Казахстан · 2024</p>
      </div>
    </div>
  );
}
