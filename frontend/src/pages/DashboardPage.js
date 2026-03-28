import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GiYarn } from 'react-icons/gi';
import {
  TbBell, TbBellRinging, TbCheck, TbTrash, TbLogout,
  TbShield, TbUser, TbCircleDot, TbBellOff,
} from 'react-icons/tb';
import useAuthStore from '../stores/useAuthStore';
import { usePush } from '../hooks/usePush';
import { api, getWsUrl } from '../api';
import { useTranslation } from 'react-i18next';
import { tr } from '../i18n';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const push = usePush();

  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showBell, setShowBell] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const wsRef = useRef(null);
  const bellRef = useRef(null);
  const { i18n } = useTranslation();
  const tt = (s) => tr(s, i18n.language);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const data = await api.notifications.list();
      setNotifications(data.notifications || []);
    } catch {}
    finally { setLoadingNotifs(false); }
  }, []);

  // WebSocket — real-time
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const ws = new WebSocket(`${getWsUrl()}/ws/notifications?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'unread_count') setUnread(msg.payload.count);
        if (msg.type === 'notification') {
          setNotifications(prev => [msg.payload, ...prev]);
          setUnread(u => u + 1);
        }
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      } catch {}
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    loadNotifications();
    api.notifications.unreadCount().then(d => setUnread(d.count)).catch(() => {});
  }, [loadNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setShowBell(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id) => {
    await api.notifications.markRead(id).catch(() => {});
    setNotifications(n => n.map(x => x.id === id ? { ...x, isRead: true } : x));
    setUnread(u => Math.max(0, u - 1));
  };

  const handleMarkAllRead = async () => {
    await api.notifications.markAllRead().catch(() => {});
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    setUnread(0);
  };

  const handleDelete = async (id) => {
    const notif = notifications.find(n => n.id === id);
    await api.notifications.delete(id).catch(() => {});
    setNotifications(n => n.filter(x => x.id !== id));
    if (notif && !notif.isRead) setUnread(u => Math.max(0, u - 1));
  };

  const handleTestNotif = async () => {
    setTestLoading(true);
    try {
      await api.notifications.sendTest();
      await loadNotifications();
      const d = await api.notifications.unreadCount();
      setUnread(d.count);
    } catch {}
    finally { setTestLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  const pushUnsupported = push.permission === 'unsupported';
  const pushDenied = push.permission === 'denied';

  return (
    <div className="min-h-screen bg-[#18120a] text-[#eddcba]">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3.5 bg-[#141009]/90 backdrop-blur-md border-b border-[#2e2010]">
        <div className="flex items-center gap-2.5">
          <GiYarn className="text-amber-500" />
          <span className="font-black tracking-[0.2em] text-[12px] uppercase text-amber-400">ShveAI</span>
        </div>

        <div className="flex items-center gap-3">
          {user?.user_type === 'admin' && (
            <motion.button whileHover={{ scale: 1.02 }} onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-amber-700 hover:text-amber-400 border border-amber-900/30 rounded-lg hover:border-amber-700/50 transition-all">
              <TbShield size={13} />{tt('Админ')}
            </motion.button>
          )}

          {/* Bell */}
          <div className="relative" ref={bellRef}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowBell(v => !v)}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-[#2e2010] bg-[#1f1610] hover:border-amber-800/50 transition-colors">
              {unread > 0 ? <TbBellRinging className="text-amber-500" size={17} /> : <TbBell className="text-stone-500" size={17} />}
              <AnimatePresence>
                {unread > 0 && (
                  <motion.span key="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 text-[#18120a] text-[9px] font-black rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <AnimatePresence>
              {showBell && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-80 bg-[#1a1308] border border-[#2e2010] rounded-2xl overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e2010]">
                    <span className="text-[12px] font-bold text-[#eddcba]">{tt('Уведомления')}</span>
                    {unread > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[11px] text-amber-700 hover:text-amber-500 transition-colors">
                        {tt('Прочитать все')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0
                      ? <div className="py-8 text-center text-stone-600 text-[12px]">{tt('Нет уведомлений')}</div>
                      : notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-[#2e2010]/40 last:border-0 ${!n.isRead ? 'bg-amber-950/10' : ''}`}>
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className={`text-[12px] font-semibold ${!n.isRead ? 'text-[#eddcba]' : 'text-stone-500'}`}>{n.title}</div>
                              <div className="text-[11px] text-stone-600 mt-0.5">{n.body}</div>
                            </div>
                            <div className="flex gap-1">
                              {!n.isRead && <button onClick={() => handleMarkRead(n.id)} className="text-stone-600 hover:text-amber-500 transition-colors p-0.5"><TbCheck size={12} /></button>}
                              <button onClick={() => handleDelete(n.id)} className="text-stone-600 hover:text-red-500 transition-colors p-0.5"><TbTrash size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User */}
          <div className="flex items-center gap-2 pl-3 border-l border-[#2e2010]">
            <div className="w-7 h-7 rounded-full bg-amber-900/40 border border-amber-800/30 flex items-center justify-center text-amber-500 text-[11px] font-bold flex-shrink-0">
              {user?.full_name?.[0]?.toUpperCase() || <TbUser size={12} />}
            </div>
            <span className="text-[12px] text-stone-400 hidden sm:block max-w-[120px] truncate">
              {user?.full_name || user?.nickname}
            </span>
            <motion.button whileHover={{ scale: 1.05 }} onClick={handleLogout} className="text-stone-600 hover:text-red-400 transition-colors ml-1">
              <TbLogout size={16} />
            </motion.button>
          </div>
        </div>
      </nav>

      <div className="pt-20 px-6 pb-12 max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-8 mt-6">
          <div className="text-[11px] text-amber-700 font-mono uppercase tracking-widest mb-2">// дашборд</div>
          <h1 className="text-2xl font-black text-[#eddcba]">
            {tt('Добро пожаловать')}, {user?.full_name?.split(' ')[0] || user?.nickname || 'пользователь'}
          </h1>
          <p className="text-stone-600 text-[13px] mt-1">{user?.email}</p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: tt('Аккаунт'), value: user?.user_type === 'admin' ? tt('Администратор') : tt('Пользователь'), sub: user?.is_verified ? tt('Верифицирован') : tt('Не верифицирован'), color: 'text-amber-400' },
            { label: tt('Уведомлений'), value: unread, sub: unread > 0 ? tt('непрочитанных') : tt('всё прочитано'), color: unread > 0 ? 'text-amber-400' : 'text-stone-500' },
            { label: tt('Статус'), value: user?.is_active ? tt('Активен') : tt('Неактивен'), sub: user?.oauth_provider ? `OAuth: ${user.oauth_provider}` : tt('Email / пароль'), color: user?.is_active ? 'text-green-500' : 'text-red-500' },
          ].map(({ label, value, sub, color }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#1f1610] border border-[#2e2010] rounded-2xl p-5 hover:border-amber-900/40 transition-colors">
              <div className="text-[11px] text-stone-600 font-mono uppercase tracking-wider mb-3">{label}</div>
              <div className={`text-xl font-black ${color}`}>{value}</div>
              <div className="text-[11px] text-stone-700 mt-1">{sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Push subscription banner */}
        <AnimatePresence>
          {!push.subscribed && !pushUnsupported && !pushDenied && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-amber-950/20 border border-amber-900/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <TbBell className="text-amber-600 flex-shrink-0" size={16} />
                  <div>
                    <div className="text-[13px] text-[#eddcba] font-medium">{tt('Включить пуш-уведомления')}</div>
                    <div className="text-[11px] text-stone-600">{tt('Получайте уведомления даже когда вкладка закрыта')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {push.error && <span className="text-[11px] text-red-400 max-w-[160px] text-right">{push.error}</span>}
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={push.subscribe}
                    disabled={push.loading}
                    className="px-3 py-1.5 bg-amber-600 text-[#18120a] text-[12px] font-bold rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
                  >
                    {push.loading ? tt('Подключение...') : tt('Вкл')}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {pushDenied && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex items-center gap-2 px-4 py-3 bg-[#1f1610] border border-[#2e2010] rounded-xl text-stone-600 text-[12px]">
              <TbBellOff size={14} />
              {tt('Пуш-уведомления заблокированы в браузере. Разрешите в настройках сайта.')}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications panel */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="bg-[#1f1610] border border-[#2e2010] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e2010]">
            <div className="flex items-center gap-2.5">
              <TbBell className="text-amber-700" size={15} />
              <span className="text-[12px] font-bold text-[#eddcba] uppercase tracking-wider">{tt('Уведомления')}</span>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-600/20 text-amber-500 text-[10px] rounded font-mono">{unread} {tt('Новые').toLowerCase()}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={handleMarkAllRead} className="text-[11px] text-amber-800 hover:text-amber-500 transition-colors">
                  {tt('Прочитать все')}
                </button>
              )}
              {push.subscribed && (
                <span className="text-[10px] text-green-600 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full inline-block" />
                  пуш вкл
                </span>
              )}
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleTestNotif} disabled={testLoading}
                className="flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-400 transition-colors disabled:opacity-40">
                <TbCircleDot size={12} className={testLoading ? 'animate-pulse' : ''} />
                Тест
              </motion.button>
            </div>
          </div>

          {loadingNotifs ? (
            <div className="py-14 text-center text-stone-600 text-[12px] font-mono">{tt('Загрузка')}...</div>
            <div className="py-14 text-center text-stone-600 text-[12px] font-mono">{tt('Загрузка')}...</div>
          ) : notifications.length === 0 ? (
            <div className="py-14 text-center">
              <TbBell className="text-stone-800 mx-auto mb-3" size={28} />
              <div className="text-stone-600 text-[13px]">{tt('Уведомлений пока нет')}</div>
              <button onClick={handleTestNotif} className="mt-3 text-[12px] text-amber-800 hover:text-amber-600 transition-colors">
                {tt('Отправить тестовое →')}
              </button>
            </div>
          ) : (
            <AnimatePresence>
              {notifications.map((n, i) => (
                <motion.div key={n.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-start gap-4 px-6 py-4 border-b border-[#2e2010]/50 last:border-0 group ${!n.isRead ? 'bg-amber-950/10' : ''}`}>
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-amber-500' : 'bg-[#2e2010]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-semibold ${!n.isRead ? 'text-[#eddcba]' : 'text-stone-500'}`}>{n.title}</div>
                    <div className="text-[12px] text-stone-600 mt-0.5 leading-relaxed">{n.body}</div>
                    <div className="text-[10px] text-stone-700 font-mono mt-1">{fmtDate(n.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.isRead && (
                      <button onClick={() => handleMarkRead(n.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-600 hover:text-amber-500 hover:bg-amber-950/30 transition-all">
                        <TbCheck size={14} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(n.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-600 hover:text-red-500 hover:bg-red-950/20 transition-all">
                      <TbTrash size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </div>
  );
}
