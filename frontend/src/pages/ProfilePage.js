import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import { api } from '../api';
import BottomNav, { Icons } from '../components/BottomNav';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

const BIO_KEY = 'bio_refresh_token';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { tr } from '../i18n';

const ROLE_LABELS = {
  client: 'Клиент',
  franchisee: 'Франчайзи',
  production: 'Производство',
  admin: 'Администратор',
};

function b64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { i18n } = useTranslation();
  const tt = (s) => tr(s, i18n.language);

  const [credentials, setCredentials] = useState([]);
  const [credsLoading, setCredsLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [msg, setMsg] = useState(null); // { text, error }
  const [nativeBioEnabled, setNativeBioEnabled] = useState(false);
  const [nativeBioAvailable, setNativeBioAvailable] = useState(false);

  const flash = (text, error = false) => {
    setMsg({ text, error });
    setTimeout(() => setMsg(null), 3500);
  };

  const loadCredentials = useCallback(async () => {
    try {
      const data = await api.webauthn.credentials();
      setCredentials(data);
    } catch {
      setCredentials([]);
    } finally {
      setCredsLoading(false);
    }
  }, []);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    Preferences.get({ key: BIO_KEY })
      .then(r => setNativeBioEnabled(!!r.value))
      .catch(() => {});
  }, []);

  const enableNativeBio = async () => {
    setRegistering(true);
    try {
      await BiometricAuth.authenticate({
        reason: 'Подтвердите личность для настройки входа',
        cancelTitle: 'Отмена',
      });
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('Нет активной сессии');
      await Preferences.set({ key: BIO_KEY, value: refreshToken });
      setNativeBioEnabled(true);
      flash('Face ID включён');
    } catch (err) {
      const code = err?.code || '';
      if (code !== 'userCancel' && code !== 'systemCancel') {
        flash(err.message || 'Ошибка', true);
      }
    } finally {
      setRegistering(false);
    }
  };

  const disableNativeBio = async () => {
    await Preferences.remove({ key: BIO_KEY });
    setNativeBioEnabled(false);
    flash('Face ID отключён');
  };

  const handleAddBiometric = async () => {
    setRegistering(true);
    try {
      const optionsData = await api.webauthn.registerOptions();

      const options = {
        ...optionsData,
        challenge: fromB64url(optionsData.challenge),
        user: {
          ...optionsData.user,
          id: fromB64url(optionsData.user.id),
        },
        excludeCredentials: (optionsData.excludeCredentials || []).map(c => ({
          ...c,
          id: fromB64url(c.id),
        })),
      };

      const credential = await navigator.credentials.create({ publicKey: options });

      const credentialData = {
        id: credential.id,
        rawId: b64url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: b64url(credential.response.attestationObject),
          clientDataJSON: b64url(credential.response.clientDataJSON),
        },
        deviceName: /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone' : navigator.userAgent.includes('Mobile') ? 'Мобильное устройство' : 'Этот компьютер',
      };

      await api.webauthn.register(credentialData);
      flash(tt('Биометрия добавлена'));
      await loadCredentials();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        flash(tt('Отменено пользователем'), true);
      } else {
        flash(err.message || tt('Ошибка регистрации'), true);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (credId) => {
    setDeletingId(credId);
    try {
      await api.webauthn.deleteCredential(credId);
      setCredentials(prev => prev.filter(c => c.id !== credId));
      flash(tt('Устройство удалено'));
    } catch (err) {
      flash(err.message || tt('Ошибка удаления'), true);
    } finally {
      setDeletingId(null);
    }
  };

  const signOut = () => { logout(); navigate('/'); };

  const fmtDate = (s) =>
    s ? new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-black text-white max-w-[430px] mx-auto">

      <nav className="fixed top-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/8 flex items-center justify-between px-5 py-4">
        <button
          onClick={() => navigate(-1)}
          className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30 hover:text-white/70 transition-colors"
        >
          ← {tt('Назад')}
        </button>
        <span className="text-xs font-black tracking-[0.35em] uppercase">{tt('Профиль')}</span>
        <button
          onClick={signOut}
          className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30 hover:text-white/70 transition-colors"
        >
          {tt('Выйти')}
        </button>
      </nav>

      <div className="px-5 pt-[80px] pb-28 space-y-8">

        {/* User info */}
        <div className="border border-white/12">
          <div className="px-5 py-4 border-b border-white/8">
            <p className="text-[9px] font-semibold tracking-[0.45em] uppercase text-white/30 mb-3">{tt('Аккаунт')}</p>
            <p className="text-lg font-black uppercase tracking-tight leading-tight">
              {user?.full_name || user?.nickname || '—'}
            </p>
            {user?.nickname && user?.full_name && (
              <p className="text-xs text-white/35 mt-0.5">@{user.nickname}</p>
            )}
          </div>
          {user?.email && (
            <div className="px-5 py-4 border-b border-white/8">
              <p className="text-[9px] font-semibold tracking-[0.45em] uppercase text-white/30 mb-1.5">Email</p>
              <p className="text-sm text-white/70">{user.email}</p>
            </div>
          )}
          <div className="px-5 py-4">
            <p className="text-[9px] font-semibold tracking-[0.45em] uppercase text-white/30 mb-1.5">{tt('Роль')}</p>
            <p className="text-sm text-white/70">{tt(ROLE_LABELS[user?.user_type] || user?.user_type)}</p>
          </div>
          <div className="px-5 py-4 border-t border-white/8 flex items-center justify-between gap-3">
            <p className="text-[9px] font-semibold tracking-[0.45em] uppercase text-white/30">{tt('Язык')}</p>
            <LanguageSwitcher variant="inline" />
          </div>
        </div>

        {/* Biometric */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-semibold tracking-[0.45em] uppercase text-white/30 mb-1">Биометрия</p>
              <p className="text-[11px] text-white/40">
                {Capacitor.isNativePlatform() ? 'Face ID / Touch ID' : 'Face ID, Touch ID, Windows Hello'}
              </p>
              <p className="text-[9px] font-semibold tracking-[0.45em] uppercase text-white/30 mb-1">{tt('Биометрия')}</p>
              <p className="text-[11px] text-white/40">Face ID, Touch ID, Windows Hello</p>
            </div>
            {Capacitor.isNativePlatform() ? (
              nativeBioEnabled ? (
                <button
                  onClick={disableNativeBio}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] border border-white/20 px-4 py-2.5 text-white/40 hover:border-red-500/50 hover:text-red-400 transition-all"
                >
                  Отключить
                </button>
              ) : (
                <button
                  onClick={enableNativeBio}
                  disabled={registering}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] border border-white/20 px-4 py-2.5 hover:border-white/40 hover:bg-white/5 transition-all disabled:opacity-30"
                >
                  {registering ? '...' : '+ Включить'}
                </button>
              )
            ) : (
              <button
                onClick={handleAddBiometric}
                disabled={registering}
                className="text-[10px] font-bold uppercase tracking-[0.2em] border border-white/20 px-4 py-2.5 hover:border-white/40 hover:bg-white/5 transition-all disabled:opacity-30"
              >
                {registering ? '...' : '+ Добавить'}
              </button>
            )}
            <button
              onClick={handleAddBiometric}
              disabled={registering}
              className="text-[10px] font-bold uppercase tracking-[0.2em] border border-white/20 px-4 py-2.5 hover:border-white/40 hover:bg-white/5 transition-all disabled:opacity-30"
            >
              {registering ? '...' : `+ ${tt('Добавить')}`}
            </button>
          </div>

          {Capacitor.isNativePlatform() && nativeBioEnabled && (
            <div className="border border-white/12 px-5 py-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-white/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <p className="text-sm font-semibold">Face ID</p>
                <p className="text-[10px] text-white/30 mt-0.5">Этот iPhone</p>
              </div>
            </div>
          )}

          {credsLoading ? (
            <div className="flex gap-1.5 py-6 justify-center">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          ) : credentials.length === 0 ? (
            <div className="border border-white/8 border-dashed px-5 py-8 text-center">
              <svg className="w-7 h-7 text-white/15 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
              <p className="text-[10px] text-white/25 uppercase tracking-wider">{tt('Нет устройств')}</p>
            </div>
          ) : (
            <div className="border border-white/12 divide-y divide-white/8">
              {credentials.map(cred => (
                <div key={cred.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold">{cred.device_name || tt('Устройство')}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {tt('Добавлено')} {fmtDate(cred.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(cred.id)}
                    disabled={deletingId === cred.id}
                    className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 hover:text-red-400/70 transition-colors disabled:opacity-30 ml-4"
                  >
                    {deletingId === cred.id ? '...' : tt('Удалить')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {msg && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 text-[11px] font-semibold uppercase tracking-wider z-50 ${
          msg.error ? 'bg-red-900/80 text-red-200' : 'bg-white/10 text-white'
        } backdrop-blur-sm border ${msg.error ? 'border-red-500/30' : 'border-white/15'}`}>
          {msg.text}
        </div>
      )}

      {user?.user_type === 'client' && (
        <BottomNav items={[
          { id: 'home',    icon: Icons.home,  label: tt('Главная'), active: false, onClick: () => navigate('/app/client') },
          { id: 'catalog', icon: Icons.grid,  label: tt('Каталог'), active: false, onClick: () => navigate('/app/client') },
          { id: 'cart',    icon: Icons.bag,   label: tt('Корзина'), active: false, onClick: () => navigate('/app/client') },
          { id: 'orders',  icon: Icons.list,  label: tt('Заказы'),  active: false, onClick: () => navigate('/app/client') },
        ]} />
      )}
      {user?.user_type === 'franchisee' && (
        <BottomNav items={[
          { id: 'main',    icon: Icons.home,   label: 'Главная', active: false, onClick: () => navigate('/app/franchisee') },
          { id: 'profile', icon: Icons.person, label: 'Профиль', active: true,  onClick: () => {} },
        ]} />
      )}
      {user?.user_type === 'production' && (
        <BottomNav items={[
          { id: 'free', icon: Icons.inbox,    label: tt('Свободные'), active: false, onClick: () => navigate('/app/production') },
          { id: 'mine', icon: Icons.scissors, label: tt('Мои'),        active: false, onClick: () => navigate('/app/production') },
        ]} />
      )}
    </div>
  );
}
