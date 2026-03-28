import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useOrderStore from '../stores/useOrderStore';
import { api, BASE_URL } from '../api';

const NEXT = { placed: 'accepted', accepted: 'sewing', sewing: 'ready', ready: 'delivered' };
const CUSTOM_NEXT = { placed: 'accepted', accepted: 'sewing', sewing: 'ready', ready: 'delivered' };

const STATUS = {
  placed:    { label: 'Новый',    dot: 'bg-white animate-pulse', badge: 'text-white bg-white/10 border border-white/20' },
  accepted:  { label: 'Принят',   dot: 'bg-white/60',            badge: 'text-white/80 bg-white/8 border border-white/12' },
  sewing:    { label: 'Пошив',    dot: 'bg-white/40',            badge: 'text-white/60 bg-transparent border border-white/10' },
  ready:     { label: 'Готов',    dot: 'bg-white/70',            badge: 'text-black bg-white' },
  delivered: { label: 'Доставлен', dot: 'bg-white/15',           badge: 'text-white/20 bg-transparent border border-white/8' },
};

const fmt = (n) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

const fmtDate = (s) =>
  new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function SetPriceModal({ order, onClose, onDone }) {
  const [price, setPrice] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { const t = setTimeout(() => setOpen(true), 15); return () => clearTimeout(t); }, []);
  const close = () => { setOpen(false); setTimeout(onClose, 280); };

  const submit = async () => {
    if (!price || parseFloat(price) <= 0) { setErr('Введите корректную цену'); return; }
    setBusy(true);
    try {
      const d = await api.customOrders.setPrice(order.id, parseFloat(price));
      onDone(d.order);
      close();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all duration-300 ${open ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}`}
      onClick={close}>
      <div className={`bg-[#080808] border border-white/10 w-full max-w-sm transition-all duration-300 ${open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        onClick={e => e.stopPropagation()}>
        <div className="p-7 space-y-5">
          <div>
            <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-1">Назначить цену</p>
            <p className="text-base font-black uppercase tracking-tight">{order.title}</p>
            {order.description && <p className="text-xs text-white/35 mt-2 leading-relaxed">{order.description}</p>}
          </div>
          {order.photoUrl && (
            <img src={`${BASE_URL}${order.photoUrl}`} alt="" className="w-full max-h-48 object-cover border border-white/8" />
          )}
          <div>
            <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Цена, ₸</p>
            <input value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="150000" inputMode="numeric"
              className="w-full bg-transparent border-b border-white/12 text-white pb-2.5 text-xl font-black outline-none focus:border-white/40 transition-colors placeholder-white/15" />
          </div>
          {err && <p className="text-xs text-red-400/80">{err}</p>}
          <div className="flex gap-2.5">
            <button onClick={close}
              className="px-5 py-4 border border-white/10 text-white/30 text-xs hover:text-white/60 transition-colors">←</button>
            <button onClick={submit} disabled={busy}
              className="flex-1 bg-white text-black text-xs font-black uppercase tracking-[0.2em] py-4 hover:bg-white/92 transition-colors disabled:opacity-40">
              {busy ? '...' : 'Назначить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FranchiseePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { orders, loading, fetchOrders, updateStatus, connectWs, disconnectWs, wsConnected } = useOrderStore();
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null);
  const [customOrders, setCustomOrders] = useState([]);
  const [priceModal, setPriceModal] = useState(null);

  useEffect(() => {
    connectWs();
    fetchOrders();
    api.customOrders.list().then(d => setCustomOrders(d.orders || [])).catch(() => {});
    return () => disconnectWs();
  }, []);

  const signOut = () => { logout(); navigate('/'); };

  const advance = async (o) => {
    const next = o.isCustom ? CUSTOM_NEXT[o.status] : NEXT[o.status];
    if (!next) return;
    setBusy(o.isCustom ? (o.id + '_c') : o.id);

    try {
      if (o.isCustom) {
        const d = await api.customOrders.updateStatus(o.id, next);
        setCustomOrders(cs => cs.map(c => c.id === o.id ? d.order : c));
      } else {
        await updateStatus(o.id, next);
      }
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  };

  const visible = filter === 'all'
    ? [...orders, ...customOrders]
    : [...orders.filter(o => o.status === filter), ...customOrders.filter(o => o.status === filter)];

  const pendingCustom = customOrders.filter(o => ['pending_review', 'pending_payment', 'placed'].includes(o.status)).length;

  const totals = {
    revenue: [
      ...orders,
      ...customOrders
    ].filter(o => !['placed'].includes(o.status)).reduce((s, o) => s + ((o.totalPrice || o.price) || 0), 0),
    fresh: [
      ...orders.filter(o => o.status === 'placed'),
      ...customOrders.filter(o => o.status === 'placed')
    ].length,
    active: [
      ...orders.filter(o => ['accepted', 'sewing'].includes(o.status)),
      ...customOrders.filter(o => ['accepted', 'sewing'].includes(o.status))
    ].length,
    done: [
      ...orders.filter(o => o.status === 'ready'),
      ...customOrders.filter(o => o.status === 'ready')
    ].length,
  };

  const filters = [
    { id: 'all', label: 'Все', count: orders.length },
    { id: 'placed', label: 'Новые', count: totals.fresh },
    { id: 'accepted', label: 'Приняты', count: null },
    { id: 'sewing', label: 'Пошив', count: null },
    { id: 'ready', label: 'Готовы', count: totals.done },
  ];

  return (
    <div className="min-h-screen bg-black text-white">

      <nav className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-[0.35em] uppercase">AVISHU</span>
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/20">Партнёр</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${wsConnected ? 'bg-white' : 'bg-white/20'}`} />
            <span className="text-[9px] font-semibold tracking-[0.25em] uppercase text-white/25">
              {wsConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <button onClick={signOut} className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/25 hover:text-white/60 transition-colors">
            Выйти
          </button>
          <button onClick={() => navigate('/app/profile')}
            className="group w-8 h-8 border border-white/12 flex items-center justify-center hover:border-white/35 transition-colors">
            <svg width="15" height="15" viewBox="0 0 17 17" fill="none" className="text-white/40 group-hover:text-white/70 transition-colors">
              <circle cx="8.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="0.85"/>
              <path d="M1 16.5c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5" stroke="currentColor" strokeWidth="0.85" strokeLinecap="square"/>
            </svg>
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8 pb-28">

        <div className="mb-8">
          <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-2">
            Добро пожаловать
          </p>
          <h1 className="text-2xl font-black uppercase tracking-tight">
            {user?.full_name || 'Партнёр'}
          </h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/6 border border-white/6 mb-8 overflow-hidden">
          {[
            { label: 'Выручка', value: fmt(totals.revenue), muted: false },
            { label: 'Новых', value: totals.fresh, muted: totals.fresh === 0, accent: totals.fresh > 0 },
            { label: 'В работе', value: totals.active, muted: totals.active === 0 },
            { label: 'Свои заказы', value: pendingCustom, muted: pendingCustom === 0, accent: pendingCustom > 0 },
          ].map(m => (
            <div key={m.label} className="bg-black px-5 py-5">
              <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-2.5">{m.label}</p>
              <p className={`text-2xl font-black ${m.accent ? 'text-white' : m.muted ? 'text-white/25' : 'text-white/80'}`}>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-px bg-white/6 border border-white/6 mb-6 overflow-hidden">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex-1 py-3 text-[10px] font-bold tracking-[0.15em] uppercase transition-colors bg-black ${
                filter === f.id ? 'text-white' : 'text-white/25 hover:text-white/50'
              }`}>
              {f.label}{f.count != null && f.count > 0 ? ` · ${f.count}` : ''}
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
              const next = o.isCustom ? CUSTOM_NEXT[o.status] : NEXT[o.status];
              return (
                <div key={`${o.isCustom ? 'c' : 'r'}${o.id}`} className="py-5 flex items-start gap-5">
                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide leading-tight">
                          {o.isCustom ? (o.title || `Заказ #${o.id}`) : (o.product?.name || `Заказ #${o.id}`)}
                        </p>
                        <p className="text-[10px] text-white/30 mt-0.5 font-medium">
                          #{o.id}
                          {o.client?.name ? ` · ${o.client.name}` : ''}
                          {o.quantity > 1 ? ` · ${o.quantity} шт.` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black">{fmt((o.totalPrice || o.price) || 0)}</p>
                        <p className="text-[9px] text-white/25 mt-0.5">{fmtDate(o.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <span className={`text-[9px] font-bold tracking-[0.2em] uppercase px-2.5 py-1 ${s.badge}`}>
                        {s.label}
                      </span>
                      {next && (
                        <button onClick={() => advance(o)} disabled={busy === (o.isCustom ? (o.id + '_c') : o.id)}
                          className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 hover:text-white border border-white/12 hover:border-white/35 px-3.5 py-1.5 transition-colors disabled:opacity-30">
                          {busy === (o.isCustom ? (o.id + '_c') : o.id) ? '...' : `→ ${STATUS[next]?.label || next}`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {customOrders.filter(o => o.status === 'pending_review').length > 0 && (
          <div className="mt-8 pt-8 border-t border-white/8">
            <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-5">
              Индивидуальные заказы на рассмотрении · {customOrders.filter(o => o.status === 'pending_review').length}
            </p>
            <div className="divide-y divide-white/6">
              {customOrders.filter(o => o.status === 'pending_review').map(o => (
                <div key={o.id} className="py-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold uppercase tracking-wide">{o.title}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        #{o.id} · {o.client?.name || ''} · {new Date(o.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                      {o.description && (
                        <p className="text-xs text-white/35 mt-2 leading-relaxed">{o.description}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setPriceModal(o)}
                    className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 hover:text-white border border-white/12 hover:border-white/35 px-4 py-2 transition-colors">
                    Назначить цену
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {customOrders.filter(o => o.status === 'pending_payment').length > 0 && (
          <div className="mt-8 pt-8 border-t border-white/8">
            <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-5">
              Ожидают оплаты · {customOrders.filter(o => o.status === 'pending_payment').length}
            </p>
            <div className="divide-y divide-white/6">
              {customOrders.filter(o => o.status === 'pending_payment').map(o => (
                <div key={o.id} className="py-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold uppercase tracking-wide">{o.title}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        #{o.id} · {o.client?.name || ''} · {new Date(o.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="text-sm font-black">{fmt(o.price)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {customOrders.filter(o => o.status === 'placed').length > 0 && (
          <div className="mt-8 pt-8 border-t border-white/8">
            <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-5">
              Оплаченные на подтверждение · {customOrders.filter(o => o.status === 'placed').length}
            </p>
            <div className="divide-y divide-white/6">
              {customOrders.filter(o => o.status === 'placed').map(o => (
                <div key={o.id} className="py-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide">{o.title}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">#{o.id} · {o.client?.name || ''}</p>
                  </div>
                  <button onClick={() => advance({ ...o, isCustom: true })}
                    disabled={busy === (o.id + '_c')}
                    className="text-[10px] font-bold uppercase tracking-[0.15em] bg-white text-black px-4 py-2 hover:bg-white/92 transition-colors disabled:opacity-40">
                    {busy === (o.id + '_c') ? '...' : 'Принять'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {priceModal && (
          <SetPriceModal
            order={priceModal}
            onClose={() => setPriceModal(null)}
            onDone={(updated) => {
              setCustomOrders(cs => cs.map(c => c.id === updated.id ? updated : c));
              setPriceModal(null);
            }}
          />
        )}
      </div>

    </div>
  );
}
