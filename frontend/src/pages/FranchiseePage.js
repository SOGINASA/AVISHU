import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useOrderStore from '../stores/useOrderStore';
import { api, BASE_URL } from '../api';
import BottomNav, { Icons } from '../components/BottomNav';
import { useTranslation } from 'react-i18next';
import { tr } from '../i18n';

const FRANCHISEE_NEXT = { placed: 'accepted', ready: 'delivered' };

const STATUS = {
  placed:    { label: 'Новые',     dot: 'bg-white animate-pulse', badge: 'text-white bg-white/10 border border-white/20' },
  accepted:  { label: 'Принят',    dot: 'bg-white/60',            badge: 'text-white/80 bg-white/8 border border-white/12' },
  sewing:    { label: 'Пошив',     dot: 'bg-white/40',            badge: 'text-white/60 bg-transparent border border-white/10' },
  ready:     { label: 'Готово',    dot: 'bg-white animate-pulse', badge: 'text-black bg-white' },
  delivered: { label: 'Доставлен', dot: 'bg-white/15',            badge: 'text-white/20 bg-transparent border border-white/8' },
};

const fmt = (n) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

const fmtDate = (s) =>
  new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const thisMonth = () => new Date().toISOString().slice(0, 7);

function SetPriceModal({ order, onClose, onDone }) {
  const [price, setPrice] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const { i18n } = useTranslation();
  const tt = (s) => tr(s, i18n.language);

  useEffect(() => { const t = setTimeout(() => setOpen(true), 15); return () => clearTimeout(t); }, []);
  const close = () => { setOpen(false); setTimeout(onClose, 280); };

  const submit = async () => {
    if (!price || parseFloat(price) <= 0) { setErr(tt('Введите корректную цену')); return; }
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
    <div className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center transition-all duration-300 ${open ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}`}
      onClick={close}>
      <div className={`bg-[#080808] border border-white/10 w-full max-w-sm transition-all duration-300 ${open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        onClick={e => e.stopPropagation()}>
        <div className="p-7 space-y-5">
          <div>
            <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-1">{tt('Назначить цену')}</p>
            <p className="text-base font-black uppercase tracking-tight">{order.title}</p>
            {order.description && <p className="text-xs text-white/35 mt-2 leading-relaxed">{order.description}</p>}
          </div>
          {order.photoUrl && (
            <img src={`${BASE_URL}${order.photoUrl}`} alt="" className="w-full max-h-48 object-cover border border-white/8" />
          )}
          <div>
            <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">{tt('Цена, ₸')}</p>
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
              {busy ? '...' : tt('Назначить цену')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const URGENCY_STYLE = {
  critical: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', dot: 'bg-red-400', label: 'Критично' },
  high:     { bg: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-400', label: 'Высокий' },
  medium:   { bg: 'bg-yellow-500/10 border-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400', label: 'Средний' },
  low:      { bg: 'bg-green-500/10 border-green-500/20', text: 'text-green-400', dot: 'bg-green-400', label: 'В норме' },
};

function MiniBar({ value, max, className = '' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`h-1 bg-white/8 overflow-hidden ${className}`}>
      <div className="h-full bg-white/40 transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

function AnalyticsTab({ tt }) {
  const [revenue, setRevenue] = useState(null);
  const [salesHistory, setSalesHistory] = useState(null);
  const [dailySales, setDailySales] = useState(null);
  const [categories, setCategories] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [period, setPeriod] = useState(30);
  const [forecastDays, setForecastDays] = useState(7);
  const [fade, setFade] = useState(false);

  // Первичная загрузка
  useEffect(() => {
    Promise.all([
      api.analytics.revenue(6).catch(() => null),
      api.analytics.salesHistory(period, 15).catch(() => null),
      api.analytics.dailySales(period).catch(() => null),
      api.analytics.byCategory(period).catch(() => null),
      api.analytics.demandForecast(forecastDays).catch(() => null),
    ]).then(([rev, sales, daily, cats, fc]) => {
      setRevenue(rev);
      setSalesHistory(sales);
      setDailySales(daily);
      setCategories(cats);
      setForecast(fc);
    }).finally(() => setInitialLoad(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обновление при смене периода — плавно без перезагрузки
  const changePeriod = (newPeriod) => {
    if (newPeriod === period) return;
    setFade(true);
    setUpdating(true);
    setTimeout(() => {
      setPeriod(newPeriod);
      Promise.all([
        api.analytics.salesHistory(newPeriod, 15).catch(() => null),
        api.analytics.dailySales(newPeriod).catch(() => null),
        api.analytics.byCategory(newPeriod).catch(() => null),
      ]).then(([sales, daily, cats]) => {
        setSalesHistory(sales);
        setDailySales(daily);
        setCategories(cats);
      }).finally(() => {
        setUpdating(false);
        setFade(false);
      });
    }, 150);
  };

  const changeForecastDays = (newDays) => {
    if (newDays === forecastDays) return;
    setUpdating(true);
    setForecastDays(newDays);
    api.analytics.demandForecast(newDays).then(fc => {
      setForecast(fc);
    }).catch(() => {}).finally(() => setUpdating(false));
  };

  if (initialLoad) {
    return <div className="py-20 text-center text-xs text-white/20 tracking-widest uppercase">{tt('Загрузка аналитики')}...</div>;
  }

  const monthlyData = revenue?.monthly || [];
  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);
  const dailyData = dailySales?.dailySales || [];
  const maxDaily = Math.max(...dailyData.map(d => d.revenue), 1);
  const catData = categories?.categories || [];
  const maxCatRev = Math.max(...catData.map(c => c.totalRevenue), 1);
  const salesItems = salesHistory?.salesHistory || [];
  const maxSold = Math.max(...salesItems.map(s => s.totalSold), 1);
  const forecastItems = forecast?.forecast || [];
  const summary = forecast?.summary || {};

  return (
    <div className="space-y-6 relative">
      {updating && (
        <div className="absolute top-0 left-0 right-0 z-10 h-0.5 bg-white/5 overflow-hidden">
          <div className="h-full w-1/3 bg-white/40 animate-[slideRight_0.8s_ease-in-out_infinite]" />
        </div>
      )}

      {/* ── Доход ── */}
      {revenue && (
        <div className="border border-white/6 overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-white/6">
            <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-2">{tt('Доход за месяц')}</p>
            <p className="text-3xl font-black">{fmt(revenue.currentMonth?.revenue || 0)}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-white/40">{revenue.currentMonth?.orders || 0} {tt('заказов')}</span>
              {revenue.growthPct != null && (
                <span className={`text-xs font-bold ${revenue.growthPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {revenue.growthPct >= 0 ? '↑' : '↓'} {Math.abs(revenue.growthPct)}%
                </span>
              )}
            </div>
          </div>
          {monthlyData.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-[8px] font-semibold tracking-[0.3em] uppercase text-white/20 mb-3">{tt('Выручка по месяцам')}</p>
              <div className="flex items-end gap-1 h-20">
                {monthlyData.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-white/6 overflow-hidden flex flex-col justify-end" style={{ height: '60px' }}>
                      <div className="bg-white/30 transition-all duration-500" style={{ height: `${(m.revenue / maxRevenue) * 100}%` }} />
                    </div>
                    <span className="text-[7px] text-white/25 font-medium">{m.label?.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Период ── */}
      <div className="flex gap-px bg-white/6 border border-white/6 overflow-hidden">
        {[7, 14, 30, 90].map(d => (
          <button key={d} onClick={() => changePeriod(d)}
            className={`flex-1 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase transition-colors bg-black ${
              period === d ? 'text-white' : 'text-white/25 hover:text-white/50'
            }`}>
            {d} {tt('дн.')}
          </button>
        ))}
      </div>

      {/* ── Ежедневные продажи ── */}
      <div className={`transition-all duration-300 ${fade ? 'opacity-30 scale-[0.99]' : 'opacity-100 scale-100'}`}>
      {dailyData.length > 0 && (
        <div className="border border-white/6 p-5">
          <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-4">{tt('Ежедневный доход')}</p>
          <div className="flex items-end gap-px h-24">
            {dailyData.slice(-30).map((d, i) => (
              <div key={i} className="flex-1 group relative">
                <div className="w-full bg-white/5 overflow-hidden flex flex-col justify-end" style={{ height: '96px' }}>
                  <div className="bg-white/25 group-hover:bg-white/40 transition-all duration-200 min-h-[1px]"
                    style={{ height: `${(d.revenue / maxDaily) * 100}%` }} />
                </div>
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black border border-white/20 px-1.5 py-1 whitespace-nowrap z-10">
                  <p className="text-[8px] text-white/60">{d.date}</p>
                  <p className="text-[9px] font-bold">{fmt(d.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── По категориям ── */}
      {catData.length > 0 && (
        <div className="border border-white/6 p-5">
          <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-4">{tt('Продажи по категориям')}</p>
          <div className="space-y-3">
            {catData.map((c, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wide">{c.category}</span>
                  <span className="text-xs text-white/40">{fmt(c.totalRevenue)} · {c.totalSold} шт.</span>
                </div>
                <MiniBar value={c.totalRevenue} max={maxCatRev} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Топ товаров ── */}
      {salesItems.length > 0 && (
        <div className="border border-white/6 p-5">
          <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-4">{tt('Топ товаров')}</p>
          <div className="space-y-3">
            {salesItems.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] text-white/20 font-bold w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide truncate">{s.productName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/30">{s.totalSold} шт.</span>
                    <span className="text-[10px] text-white/30">{fmt(s.totalRevenue)}</span>
                  </div>
                  <MiniBar value={s.totalSold} max={maxSold} className="mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* ── ML-прогноз дефицита ── */}
      <div className="border border-white/6 overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-white/6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25">{tt('Прогноз дефицита')}</p>
            <div className="flex gap-1">
              {[7, 14].map(d => (
                <button key={d} onClick={() => changeForecastDays(d)}
                  className={`text-[9px] font-bold px-2 py-1 border transition-colors ${
                    forecastDays === d ? 'border-white/30 text-white' : 'border-white/8 text-white/25 hover:text-white/50'
                  }`}>
                  {d}{tt('д')}
                </button>
              ))}
            </div>
          </div>
          {summary.total > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'critical', label: tt('Критично'), color: 'text-red-400' },
                { key: 'high', label: tt('Высокий'), color: 'text-orange-400' },
                { key: 'medium', label: tt('Средний'), color: 'text-yellow-400' },
                { key: 'low', label: tt('В норме'), color: 'text-green-400' },
              ].map(u => (
                <div key={u.key} className="text-center py-2 bg-white/3">
                  <p className={`text-lg font-black ${u.color}`}>{summary[u.key] || 0}</p>
                  <p className="text-[7px] font-semibold tracking-[0.2em] uppercase text-white/25">{u.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {forecastItems.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-white/25">
            {forecast?.error || tt('Нет данных для прогноза. Убедитесь, что ML-модель обучена.')}
          </div>
        ) : (
          <div className="divide-y divide-white/6">
            {forecastItems.filter(f => f.urgency !== 'low').map((f, i) => {
              const st = URGENCY_STYLE[f.urgency] || URGENCY_STYLE.low;
              return (
                <div key={i} className={`px-5 py-4 ${i === 0 && f.urgency === 'critical' ? 'bg-red-500/5' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        <p className="text-xs font-bold uppercase tracking-wide truncate">{f.product_name}</p>
                      </div>
                      <p className="text-[10px] text-white/30 ml-3.5">{f.category} · {fmt(f.price)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-[9px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 border ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 ml-3.5">
                    <div>
                      <p className="text-[8px] text-white/20 font-semibold">{tt('Остаток')}</p>
                      <p className="text-sm font-black">{f.current_stock}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-white/20 font-semibold">{tt('Спрос')}/д</p>
                      <p className="text-sm font-black">{f.avg_daily_demand}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-white/20 font-semibold">{tt('Хватит на')}</p>
                      <p className="text-sm font-black">{f.days_until_stockout < 100 ? `${f.days_until_stockout}д` : '∞'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-white/20 font-semibold">{tt('Дозаказ')}</p>
                      <p className="text-sm font-black">{f.reorder_quantity} шт.</p>
                    </div>
                  </div>
                  {f.recommendation && (
                    <p className="text-[10px] text-white/25 mt-2 ml-3.5 italic">{f.recommendation}</p>
                  )}
                </div>
              );
            })}
            {forecastItems.filter(f => f.urgency === 'low').length > 0 && (
              <div className="px-5 py-3 text-xs text-white/25">
                ✓ {forecastItems.filter(f => f.urgency === 'low').length} {tt('позиций в норме')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FranchiseePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const {
    orders, customOrders, loading,
    fetchOrders, fetchCustomOrders, updateStatus, updateCustomOrder,
    connectWs, disconnectWs, wsConnected,
  } = useOrderStore();
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null);
  const [priceModal, setPriceModal] = useState(null);
  const [salesPlan, setSalesPlan] = useState(null);
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'main');
  const { i18n } = useTranslation();
  const tt = (s) => tr(s, i18n.language);

  useEffect(() => {
    connectWs();
    fetchOrders();
    fetchCustomOrders();
    api.admin.myPlan(thisMonth()).then(d => setSalesPlan(d.plan)).catch(() => {});
    return () => disconnectWs();
  }, []);

  const signOut = () => { logout(); navigate('/'); };

  const advance = async (o) => {
    const next = FRANCHISEE_NEXT[o.status];
    if (!next) return;
    setBusy(o.isCustom ? (o.id + '_c') : o.id);
    try {
      if (o.isCustom) {
        const d = await api.customOrders.updateStatus(o.id, next);
        updateCustomOrder(d.order);
      } else {
        await updateStatus(o.id, next);
      }
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  };

  const acceptCustom = async (o) => {
    setBusy(o.id + '_c');
    try {
      const d = await api.customOrders.updateStatus(o.id, 'accepted');
      updateCustomOrder(d.order);
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  };

  const month = thisMonth();
  const monthRevenue = [
    ...orders.filter(o => (o.createdAt || '').startsWith(month) && o.status !== 'placed'),
    ...customOrders.filter(o => (o.createdAt || '').startsWith(month) && !['pending_review', 'pending_payment', 'placed'].includes(o.status)),
  ].reduce((s, o) => s + ((o.totalPrice || o.price) || 0), 0);

  const totals = {
    fresh:  orders.filter(o => o.status === 'placed').length,
    active: [
      ...orders.filter(o => ['accepted', 'sewing'].includes(o.status)),
      ...customOrders.filter(o => ['accepted', 'sewing'].includes(o.status)),
    ].length,
    ready: [
      ...orders.filter(o => o.status === 'ready'),
      ...customOrders.filter(o => o.status === 'ready'),
    ].length,
  };

  const pendingReview   = customOrders.filter(o => o.status === 'pending_review');
  const pendingPayment  = customOrders.filter(o => o.status === 'pending_payment');
  const pendingAccept   = customOrders.filter(o => o.status === 'placed');

  const planTarget = salesPlan?.target || 0;
  const planPct = planTarget > 0 ? Math.min(100, (monthRevenue / planTarget) * 100) : 0;

  const mainOrders = [
    ...orders,
    ...customOrders.filter(o => ['accepted', 'sewing', 'ready', 'delivered'].includes(o.status)),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const visible = filter === 'all'
    ? mainOrders
    : mainOrders.filter(o => o.status === filter);

  const allCount = mainOrders.length;
  const readyCount = totals.ready;

  const filters = [
    { id: 'all',      label: tt('Все'),     count: allCount },
    { id: 'placed',   label: tt('Новые'),   count: totals.fresh },
    { id: 'accepted', label: tt('Приняты'), count: null },
    { id: 'sewing',   label: tt('Пошив'),   count: null },
    { id: 'ready',    label: tt('Готовы'),  count: readyCount },
  ];

  return (
    <div className="min-h-screen bg-black text-white">

      <nav className="fixed top-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-[0.35em] uppercase">AVISHU</span>
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/20">{tt('Партнёр')}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${wsConnected ? 'bg-white' : 'bg-white/20'}`} />
            <span className="text-[9px] font-semibold tracking-[0.25em] uppercase text-white/25">
              {wsConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <button onClick={signOut} className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/25 hover:text-white/60 transition-colors">
            {tt('Выйти')}
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

      <div className="max-w-3xl mx-auto px-6 pt-[80px] pb-28">

        <div className="mb-8">
          <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-2">{tt('Добро пожаловать')}</p>
          <h1 className="text-2xl font-black uppercase tracking-tight">{user?.full_name || tt('Партнёр')}</h1>
        </div>

        {activeTab === 'analytics' ? (
          <AnalyticsTab tt={tt} />
        ) : (
        <>
        <div className="border border-white/6 mb-8 overflow-hidden">
          <div className="bg-black px-5 pt-5 pb-4 border-b border-white/6">
            <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-2">{tt('Выручка')} · {month}</p>
            <p className="text-3xl font-black text-white mb-4">{fmt(monthRevenue)}</p>
            {planTarget > 0 && (
              <>
                <div className="h-px bg-white/8 overflow-hidden mb-2">
                  <div className="h-full bg-white/45 transition-all duration-700" style={{ width: `${planPct}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[9px] text-white/30 font-semibold">
                    {planPct >= 100 ? '✓ план выполнен' : `${Math.round(planPct)}%`}
                  </p>
                  <p className="text-[9px] text-white/30 font-semibold">
                    {planTarget > monthRevenue
                      ? `план ${fmt(planTarget)} · осталось ${fmt(planTarget - monthRevenue)}`
                      : `план ${fmt(planTarget)} · +${fmt(monthRevenue - planTarget)}`}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-4 gap-px bg-white/6">
            {[
              { label: tt('Новых'),   value: totals.fresh,  accent: totals.fresh > 0 },
              { label: tt('В работе'), value: totals.active, muted: totals.active === 0 },
              { label: tt('Готовы'),  value: totals.ready,  accent: totals.ready > 0 },
              { label: tt('Индив.'),  value: pendingReview.length + pendingPayment.length + pendingAccept.length, accent: (pendingReview.length + pendingPayment.length + pendingAccept.length) > 0 },
            ].map(m => (
              <div key={m.label} className="bg-black px-3 py-4">
                <p className="text-[8px] font-semibold tracking-[0.3em] uppercase text-white/25 mb-2">{m.label}</p>
                <p className={`text-xl font-black ${m.accent ? 'text-white' : m.muted ? 'text-white/20' : 'text-white/70'}`}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
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
          <div className="py-20 text-center text-sm text-white/20">{tt('Заказов нет')}</div>
        ) : (
          <div className="divide-y divide-white/6">
            {visible.map(o => {
              const s = STATUS[o.status] || STATUS.placed;
              const next = FRANCHISEE_NEXT[o.status];
              const busyKey = o.isCustom ? (o.id + '_c') : o.id;
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
                          {!o.isCustom && o.desiredDate ? ` · к ${new Date(o.desiredDate).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}` : ''}
                          {o.isCustom ? ' · Индив.' : ''}
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
                        <button onClick={() => advance(o)} disabled={busy === busyKey}
                          className={`text-[10px] font-bold uppercase tracking-[0.15em] px-3.5 py-1.5 transition-colors disabled:opacity-30 ${
                            next === 'delivered'
                              ? 'bg-white text-black hover:bg-white/90'
                              : 'text-white/40 hover:text-white border border-white/12 hover:border-white/35'
                          }`}>
                          {busy === busyKey ? '...' : next === 'delivered' ? tt('Доставлен') : `→ ${tt(STATUS[next]?.label || next)}`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pendingReview.length > 0 && (
          <div className="mt-8 pt-8 border-t border-white/8">
            <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-5">
              {tt('На рассмотрении')} · {pendingReview.length}
            </p>
            <div className="divide-y divide-white/6">
              {pendingReview.map(o => (
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
                    {tt('Назначить цену')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingPayment.length > 0 && (
          <div className="mt-8 pt-8 border-t border-white/8">
            <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-5">
              {tt('Ожидает оплаты')} · {pendingPayment.length}
            </p>
            <div className="divide-y divide-white/6">
              {pendingPayment.map(o => (
                <div key={o.id} className="py-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide">{o.title}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      #{o.id} · {o.client?.name || ''} · {new Date(o.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-sm font-black">{fmt(o.price)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingAccept.length > 0 && (
          <div className="mt-8 pt-8 border-t border-white/8">
            <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-5">
              {tt('Оплачены · ждут подтверждения ·')} {pendingAccept.length}
            </p>
            <div className="divide-y divide-white/6">
              {pendingAccept.map(o => (
                <div key={o.id} className="py-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide">{o.title}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">#{o.id} · {o.client?.name || ''}</p>
                  </div>
                  <button onClick={() => acceptCustom(o)} disabled={busy === (o.id + '_c')}
                    className="text-[10px] font-bold uppercase tracking-[0.15em] bg-white text-black px-4 py-2 hover:bg-white/92 transition-colors disabled:opacity-40">
                    {busy === (o.id + '_c') ? '...' : tt('Принять')}
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
              updateCustomOrder(updated);
              setPriceModal(null);
            }}
          />
        )}
        </>
        )}
      </div>

      <BottomNav items={[
        { id: 'main',      icon: Icons.home,   label: tt('Главная'),    active: activeTab === 'main',      onClick: () => setActiveTab('main') },
        { id: 'analytics', icon: Icons.chart, label: tt('Аналитика'), active: activeTab === 'analytics', onClick: () => setActiveTab('analytics') },
        { id: 'profile',   icon: Icons.person, label: tt('Профиль'),    active: false, onClick: () => navigate('/app/profile') },
      ]} />
    </div>
  );
}
