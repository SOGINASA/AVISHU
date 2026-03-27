import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GiYarn } from 'react-icons/gi';
import {
  TbUsers, TbChartBar, TbMessage, TbArrowLeft,
  TbSearch, TbCheck, TbX, TbRefresh, TbList,
  TbLogout,
} from 'react-icons/tb';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

const TABS = [
  { id: 'stats', label: 'Статистика', icon: TbChartBar },
  { id: 'users', label: 'Пользователи', icon: TbUsers },
  { id: 'feedback', label: 'Отзывы', icon: TbMessage },
  { id: 'logs', label: 'Аудит', icon: TbList },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);

  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [search, setSearch] = useState('');

  const [feedback, setFeedback] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.admin.stats().then(setStats).catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.users(userPage, search);
      setUsers(data.users || []);
      setUserTotal(data.total || 0);
      setUserPages(data.pages || 1);
    } catch {}
    finally { setLoading(false); }
  }, [userPage, search]);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.feedback();
      setFeedback(data.feedbacks || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.auditLogs();
      setAuditLogs(data.logs || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'feedback') loadFeedback();
    if (tab === 'logs') loadLogs();
  }, [tab, loadUsers, loadFeedback, loadLogs]);

  const toggleActive = async (u) => {
    try {
      if (u.is_active) await api.admin.deactivate(u.id);
      else await api.admin.activate(u.id);
      loadUsers();
    } catch {}
  };

  const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="min-h-screen bg-[#18120a] text-[#eddcba]">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3.5 bg-[#141009]/90 backdrop-blur-md border-b border-[#2e2010]">
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ x: -2 }} onClick={() => navigate('/dashboard')} className="text-stone-600 hover:text-amber-500 transition-colors">
            <TbArrowLeft size={18} />
          </motion.button>
          <GiYarn className="text-amber-500" />
          <span className="font-black tracking-[0.2em] text-[12px] uppercase text-amber-400">ShveAI</span>
          <span className="text-stone-700 text-[11px] font-mono">/ admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-stone-600 text-[12px] hidden sm:block">{user?.email}</span>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => { logout(); navigate('/'); }} className="text-stone-600 hover:text-red-400 transition-colors">
            <TbLogout size={16} />
          </motion.button>
        </div>
      </nav>

      <div className="pt-20 px-6 pb-12 max-w-5xl mx-auto">

        <div className="mb-6 mt-6">
          <div className="text-[11px] text-amber-700 font-mono uppercase tracking-widest mb-1">// панель администратора</div>
          <h1 className="text-2xl font-black text-[#eddcba]">Управление</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#1a1308] border border-[#2e2010] rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-lg text-[12px] transition-all ${
                tab === id ? 'bg-amber-600/20 text-amber-400 font-semibold' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* STATS */}
        {tab === 'stats' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {!stats ? (
              <div className="py-12 text-center text-stone-600 text-[12px] font-mono">Загрузка...</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Всего пользователей', value: stats.users?.total, color: 'text-amber-400' },
                  { label: 'Активных', value: stats.users?.active, color: 'text-green-500' },
                  { label: 'Верифицированных', value: stats.users?.verified, color: 'text-blue-400' },
                  { label: 'Непрочитанных отзывов', value: stats.feedback?.unread, color: stats.feedback?.unread > 0 ? 'text-red-400' : 'text-stone-500' },
                ].map(({ label, value, color }) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1f1610] border border-[#2e2010] rounded-2xl p-5 hover:border-amber-900/40 transition-colors"
                  >
                    <div className="text-[11px] text-stone-600 font-mono uppercase tracking-wider mb-3">{label}</div>
                    <div className={`text-3xl font-black ${color}`}>{value ?? '—'}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" size={14} />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setUserPage(1); }}
                  placeholder="Поиск по email, имени, нику..."
                  className="w-full bg-[#1f1610] border border-[#2e2010] rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-[#eddcba] placeholder-stone-700 outline-none focus:border-amber-800/50 transition-colors"
                />
              </div>
              <button
                onClick={loadUsers}
                className="px-3 py-2.5 bg-[#1f1610] border border-[#2e2010] rounded-xl text-stone-600 hover:text-amber-500 transition-colors"
              >
                <TbRefresh size={15} />
              </button>
            </div>

            <div className="bg-[#1f1610] border border-[#2e2010] rounded-2xl overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_80px] text-[10px] text-stone-600 font-mono uppercase tracking-wider px-5 py-3 border-b border-[#2e2010]">
                <span>Пользователь</span>
                <span>Email / Ник</span>
                <span>Тип</span>
                <span>Действие</span>
              </div>

              {loading ? (
                <div className="py-10 text-center text-stone-600 text-[12px] font-mono">Загрузка...</div>
              ) : users.length === 0 ? (
                <div className="py-10 text-center text-stone-600 text-[13px]">Пользователи не найдены</div>
              ) : (
                users.map(u => (
                  <div
                    key={u.id}
                    className="flex sm:grid sm:grid-cols-[1fr_1fr_80px_80px] items-center gap-3 px-5 py-3.5 border-b border-[#2e2010]/50 last:border-0 hover:bg-white/[0.015] transition-colors"
                  >
                    <div>
                      <div className={`text-[13px] font-medium ${u.is_active ? 'text-[#eddcba]' : 'text-stone-600 line-through'}`}>
                        {u.full_name || u.nickname || '—'}
                      </div>
                      <div className="text-[10px] text-stone-700 font-mono">#{u.id}</div>
                    </div>
                    <div className="text-[12px] text-stone-500 truncate">{u.email || u.nickname || '—'}</div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded w-fit ${
                      u.user_type === 'admin'
                        ? 'bg-amber-900/30 text-amber-600'
                        : 'bg-[#2e2010] text-stone-600'
                    }`}>
                      {u.user_type}
                    </span>
                    <button
                      onClick={() => toggleActive(u)}
                      className={`flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg transition-colors w-fit ${
                        u.is_active
                          ? 'bg-red-950/25 text-red-500 hover:bg-red-950/40'
                          : 'bg-green-950/25 text-green-500 hover:bg-green-950/40'
                      }`}
                    >
                      {u.is_active ? <><TbX size={11} /> Откл</> : <><TbCheck size={11} /> Вкл</>}
                    </button>
                  </div>
                ))
              )}
            </div>

            {(userPages > 1 || userTotal > 0) && (
              <div className="flex items-center justify-between mt-3 px-1">
                <div className="text-stone-700 text-[11px] font-mono">Всего: {userTotal}</div>
                {userPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={userPage === 1}
                      onClick={() => setUserPage(p => p - 1)}
                      className="px-3 py-1.5 bg-[#1f1610] border border-[#2e2010] rounded-lg text-[12px] text-stone-500 disabled:opacity-30 hover:border-amber-900/40 transition-colors"
                    >←</button>
                    <span className="text-[12px] text-stone-600 font-mono">{userPage} / {userPages}</span>
                    <button
                      disabled={userPage === userPages}
                      onClick={() => setUserPage(p => p + 1)}
                      className="px-3 py-1.5 bg-[#1f1610] border border-[#2e2010] rounded-lg text-[12px] text-stone-500 disabled:opacity-30 hover:border-amber-900/40 transition-colors"
                    >→</button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* FEEDBACK */}
        {tab === 'feedback' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-[#1f1610] border border-[#2e2010] rounded-2xl overflow-hidden">
              {loading ? (
                <div className="py-10 text-center text-stone-600 text-[12px] font-mono">Загрузка...</div>
              ) : feedback.length === 0 ? (
                <div className="py-12 text-center text-stone-600 text-[13px]">Отзывов нет</div>
              ) : (
                feedback.map(f => (
                  <div key={f.id} className={`px-5 py-4 border-b border-[#2e2010]/50 last:border-0 ${!f.isRead ? 'bg-amber-950/10' : ''}`}>
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        {!f.isRead && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1" />}
                        <div className={`text-[13px] font-semibold ${!f.isRead ? 'text-[#eddcba]' : 'text-stone-500'}`}>
                          {f.user?.name || f.user?.email || 'Аноним'}
                        </div>
                      </div>
                      <div className="text-[10px] text-stone-600 font-mono flex-shrink-0">{fmtDate(f.createdAt)}</div>
                    </div>
                    {f.category && (
                      <span className="text-[10px] font-mono text-stone-700 bg-[#2e2010] px-2 py-0.5 rounded mb-2 inline-block">
                        {f.category}
                      </span>
                    )}
                    <div className="text-[12px] text-stone-500 leading-relaxed">{f.message || f.body || '—'}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* AUDIT LOGS */}
        {tab === 'logs' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-[#1f1610] border border-[#2e2010] rounded-2xl overflow-hidden">
              <div className="hidden sm:grid grid-cols-[16px_1fr_1fr_100px] text-[10px] text-stone-600 font-mono uppercase tracking-wider px-5 py-3 border-b border-[#2e2010] gap-3">
                <span></span>
                <span>Действие</span>
                <span>Детали</span>
                <span>Время</span>
              </div>
              {loading ? (
                <div className="py-10 text-center text-stone-600 text-[12px] font-mono">Загрузка...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-stone-600 text-[13px]">Логов нет</div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="grid grid-cols-[16px_1fr_100px] sm:grid-cols-[16px_1fr_1fr_100px] items-center gap-3 px-5 py-3.5 border-b border-[#2e2010]/50 last:border-0 hover:bg-white/[0.01] transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-600' : 'bg-red-600'}`} />
                    <div>
                      <div className="text-[12px] text-[#eddcba]">{log.action_type}</div>
                      {log.user_id && <div className="text-[10px] text-stone-700 font-mono">user #{log.user_id}</div>}
                    </div>
                    <div className="text-[11px] text-stone-600 truncate hidden sm:block">
                      {log.details || log.description || log.ip_address || '—'}
                    </div>
                    <div className="text-[10px] text-stone-700 font-mono text-right">{fmtDate(log.created_at)}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
