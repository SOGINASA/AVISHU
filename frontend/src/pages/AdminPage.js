import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useOrderStore from '../stores/useOrderStore';
import { api } from '../api';

const NEXT = { placed: 'accepted', accepted: 'sewing', sewing: 'ready', ready: 'delivered' };

const STATUS = {
  placed:    { label: 'Новый',     dot: 'bg-white animate-pulse' },
  accepted:  { label: 'Принят',    dot: 'bg-white/60' },
  sewing:    { label: 'Пошив',     dot: 'bg-white/40' },
  ready:     { label: 'Готов',     dot: 'bg-white/70' },
  delivered: { label: 'Доставлен', dot: 'bg-white/15' },
};

const fmt = (n) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

const fmtDate = (s) =>
  new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { orders, loading, fetchOrders, updateStatus, connectWs, disconnectWs, wsConnected } = useOrderStore();

  const [tab, setTab] = useState('orders');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    connectWs();
    fetchOrders();
    return () => disconnectWs();
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const d = await api.admin.users(1, search);
      setUsers(d.users || []);
    } catch {}
    finally { setUsersLoading(false); }
  }, [search]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab, loadUsers]);

  const signOut = () => { logout(); navigate('/'); };

  const advance = async (o) => {
    const next = NEXT[o.status];
    if (!next) return;
    setBusy(o.id);
    try { await updateStatus(o.id, next); }
    catch (e) { alert(e.message); }
    finally { setBusy(null); }
  };

  const toggleUser = async (u) => {
    try {
      if (u.is_active) await api.admin.deactivate(u.id);
      else await api.admin.activate(u.id);
      loadUsers();
    } catch {}
  };

  const visible = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const totals = {
    revenue: orders.filter(o => o.status !== 'placed').reduce((s, o) => s + (o.totalPrice || 0), 0),
    fresh: orders.filter(o => o.status === 'placed').length,
    active: orders.filter(o => ['accepted', 'sewing'].includes(o.status)).length,
    done: orders.filter(o => o.status === 'ready').length,
  };

  const ROLE_LABEL = { client: 'Клиент', franchisee: 'Партнёр', production: 'Цех', admin: 'Адм' };

  return (
    <div className="min-h-screen bg-black text-white">

      <nav className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-[0.35em] uppercase">AVISHU</span>
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/20">Admin</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${wsConnected ? 'bg-white' : 'bg-white/20'}`} />
            <span className="text-[9px] font-semibold tracking-[0.25em] uppercase text-white/25">
              {wsConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <button onClick={signOut} className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/25 hover:text-white/60 transition-colors">
            Выйти
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="mb-8">
          <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-2">Панель управления</p>
          <h1 className="text-2xl font-black uppercase tracking-tight">{user?.full_name || 'Admin'}</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/6 border border-white/6 mb-8 overflow-hidden">
          {[
            { label: 'Выручка',  value: fmt(totals.revenue) },
            { label: 'Новых',    value: totals.fresh,  accent: totals.fresh > 0 },
            { label: 'В работе', value: totals.active, muted: totals.active === 0 },
            { label: 'Готово',   value: totals.done,   muted: totals.done === 0 },
          ].map(m => (
            <div key={m.label} className="bg-black px-5 py-5">
              <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-2.5">{m.label}</p>
              <p className={`text-2xl font-black ${m.accent ? 'text-white' : m.muted ? 'text-white/25' : 'text-white/80'}`}>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-px bg-white/6 border border-white/6 mb-8 overflow-hidden">
          {['orders', 'users'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors bg-black ${
                tab === t ? 'text-white' : 'text-white/25 hover:text-white/50'
              }`}>
              {t === 'orders' ? `Заказы · ${orders.length}` : 'Пользователи'}
            </button>
          ))}
        </div>

        {tab === 'orders' && (
          <>
            <div className="flex gap-px bg-white/6 border border-white/6 mb-6 overflow-hidden">
              {[
                { id: 'all', label: 'Все' },
                { id: 'placed', label: 'Новые' },
                { id: 'accepted', label: 'Приняты' },
                { id: 'sewing', label: 'Пошив' },
                { id: 'ready', label: 'Готовы' },
                { id: 'delivered', label: 'Доставлены' },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`flex-1 py-2.5 text-[9px] font-bold tracking-[0.1em] uppercase transition-colors bg-black ${
                    filter === f.id ? 'text-white' : 'text-white/25 hover:text-white/50'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="py-20 text-center text-xs text-white/20 tracking-widest uppercase">Загрузка</div>
            ) : visible.length === 0 ? (
              <div className="py-20 text-center text-sm text-white/20">Заказов нет</div>
            ) : (
              <div className="divide-y divide-white/6">
                {visible.map(o => {
                  const s = STATUS[o.status] || STATUS.placed;
                  const next = NEXT[o.status];
                  return (
                    <div key={o.id} className="py-5 flex items-start gap-5">
                      <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div>
                            <p className="text-sm font-bold uppercase tracking-wide leading-tight">
                              {o.product?.name || `Заказ #${o.id}`}
                            </p>
                            <p className="text-[10px] text-white/30 mt-0.5 font-medium">
                              #{o.id}
                              {o.client?.name ? ` · ${o.client.name}` : ''}
                              {o.quantity > 1 ? ` · ${o.quantity} шт.` : ''}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black">{fmt(o.totalPrice)}</p>
                            <p className="text-[9px] text-white/25 mt-0.5">{fmtDate(o.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-[9px] font-bold tracking-[0.2em] uppercase px-2.5 py-1 border border-white/12 text-white/40">
                            {s.label}
                          </span>
                          {next && (
                            <button onClick={() => advance(o)} disabled={busy === o.id}
                              className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 hover:text-white border border-white/12 hover:border-white/35 px-3.5 py-1.5 transition-colors disabled:opacity-30">
                              {busy === o.id ? '...' : `→ ${STATUS[next]?.label || next}`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'users' && (
          <>
            <div className="flex gap-3 mb-6">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadUsers()}
                placeholder="Поиск по email или имени..."
                className="flex-1 bg-transparent border border-white/12 text-white/80 px-4 py-2.5 text-xs outline-none focus:border-white/35 transition-colors placeholder-white/20"
              />
              <button onClick={loadUsers}
                className="px-5 py-2.5 border border-white/12 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 hover:text-white hover:border-white/35 transition-colors">
                Найти
              </button>
            </div>

            {usersLoading ? (
              <div className="py-20 text-center text-xs text-white/20 tracking-widest uppercase">Загрузка</div>
            ) : (
              <div className="divide-y divide-white/6">
                {users.map(u => (
                  <div key={u.id} className="py-4 flex items-center gap-5">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold uppercase tracking-wide ${u.is_active ? '' : 'line-through text-white/30'}`}>
                        {u.full_name || u.nickname || '—'}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {u.email} · {ROLE_LABEL[u.user_type] || u.user_type}
                      </p>
                    </div>
                    <button onClick={() => toggleUser(u)}
                      className={`text-[10px] font-bold uppercase tracking-[0.15em] px-3.5 py-1.5 border transition-colors ${
                        u.is_active
                          ? 'border-white/12 text-white/30 hover:border-red-500/40 hover:text-red-400'
                          : 'border-white/12 text-white/30 hover:border-white/35 hover:text-white'
                      }`}>
                      {u.is_active ? 'Откл' : 'Вкл'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
