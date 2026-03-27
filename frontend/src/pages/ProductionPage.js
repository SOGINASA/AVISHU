import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useOrderStore from '../stores/useOrderStore';
import { api, BASE_URL } from '../api';

export default function ProductionPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { orders, fetchOrders, updateStatus, connectWs, disconnectWs, wsConnected } = useOrderStore();

  const [customOrders, setCustomOrders] = useState([]);
  const [busy, setBusy] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState('free');

  useEffect(() => {
    connectWs();
    fetchOrders();
    api.customOrders.list().then(d => setCustomOrders(d.orders || [])).catch(() => {});
    return () => disconnectWs();
  }, []);

  const signOut = () => { logout(); navigate('/'); };

  const uid = user?.id;

  const freeRegular = orders.filter(o => o.status === 'accepted' && (!o.seamstressId || o.seamstressId === uid));
  const myRegular = orders.filter(o => o.seamstressId === uid);

  const freeCustOrds = customOrders.filter(o => o.status === 'accepted' && (!o.seamstressId || o.seamstressId === uid));
  const myCustOrds = customOrders.filter(o => o.seamstressId === uid);

  const freeAll = [...freeRegular, ...freeCustOrds].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const myAll = [...myRegular, ...myCustOrds].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const freeCount = freeAll.length;
  const myCount = myAll.length;

  const claim = async (o) => {
    setBusy(o.id + (o.isCustom ? '_c' : ''));
    try {
      if (o.isCustom) {
        const d = await api.customOrders.claim(o.id);
        setCustomOrders(cs => cs.map(c => c.id === o.id ? d.order : c));
      } else {
        await api.orders.claim(o.id);
        fetchOrders();
      }
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  };

  const unclaim = async (o) => {
    setBusy(o.id + (o.isCustom ? '_c' : ''));
    try {
      if (o.isCustom) {
        const d = await api.customOrders.unclaim(o.id);
        setCustomOrders(cs => cs.map(c => c.id === o.id ? d.order : c));
      } else {
        await api.orders.unclaim(o.id);
        fetchOrders();
      }
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  };

  const advance = async (o, toStatus) => {
    setBusy(o.id + (o.isCustom ? '_c' : ''));
    try {
      if (o.isCustom) {
        const d = await api.customOrders.updateStatus(o.id, toStatus);
        setCustomOrders(cs => cs.map(c => c.id === o.id ? d.order : c));
      } else {
        await updateStatus(o.id, toStatus);
      }
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  };

  const STATUS_NEXT = { accepted: 'sewing', sewing: 'ready' };
  const STATUS_LABEL = { accepted: 'Принят', sewing: 'Пошив', ready: 'Готово', delivered: 'Доставлен', placed: 'Новый' };
  const NEXT_LABEL = { sewing: 'В пошив', ready: 'Готово' };

  const key = (o) => (o.isCustom ? 'c' : 'r') + o.id;

  const OrderCard = ({ o }) => {
    const isExpanded = expanded === key(o);
    const isMine = o.seamstressId === uid;
    const isFree = !o.seamstressId;
    const nextStatus = STATUS_NEXT[o.status];
    const busyKey = o.id + (o.isCustom ? '_c' : '');

    return (
      <div className="border border-white/10 bg-[#080808] overflow-hidden">
        <button className="w-full text-left" onClick={() => setExpanded(isExpanded ? null : key(o))}>
          <div className="px-5 pt-5 pb-4">
            {o.isCustom && (
              <span className="text-[8px] font-bold tracking-[0.4em] uppercase text-white/25 border border-white/12 px-2 py-0.5 mr-2">
                Своё
              </span>
            )}
            <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/25 mb-1.5 mt-2">
              #{o.id} · {o.client?.name || ''} · <span className={`${isMine ? 'text-white/50' : ''}`}>{STATUS_LABEL[o.status] || o.status}</span>
            </p>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-black uppercase tracking-tight leading-tight">
                {o.isCustom ? o.title : (o.product?.name || `Заказ #${o.id}`)}
              </h3>
              <span className="text-[10px] text-white/25 flex-shrink-0 mt-0.5">{isExpanded ? '▲' : '▼'}</span>
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="px-5 pb-5 pt-2 border-t border-white/6 space-y-3">
            {o.isCustom && o.photoUrl && (
              <img src={`${BASE_URL}${o.photoUrl}`} alt="" className="w-full max-h-48 object-cover border border-white/8" />
            )}
            {!o.isCustom && o.product?.imageUrl && (
              <img src={`${BASE_URL}${o.product.imageUrl}`} alt="" className="w-20 h-28 object-cover border border-white/8" />
            )}
            {o.isCustom && o.description && (
              <p className="text-xs text-white/40 leading-relaxed">{o.description}</p>
            )}
            {!o.isCustom && o.product?.description && (
              <p className="text-xs text-white/40 leading-relaxed">{o.product.description}</p>
            )}
            {o.quantity > 1 && <p className="text-xs text-white/30">{o.quantity} шт.</p>}
            {o.desiredDate && (
              <p className="text-xs text-white/30">
                Срок: {new Date(o.desiredDate).toLocaleDateString('ru-RU')}
              </p>
            )}
            {o.notes && <p className="text-xs text-white/30">Заметки: {o.notes}</p>}
            {o.isCustom && o.price && (
              <p className="text-xs text-white/50 font-bold">
                {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(o.price)}
              </p>
            )}
          </div>
        )}

        <div className="px-5 pb-5 flex gap-2.5">
          {isFree && (
            <button onClick={() => claim(o)} disabled={busy === busyKey}
              className="flex-1 py-3.5 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/92 transition-colors disabled:opacity-40">
              {busy === busyKey ? '...' : 'Взять'}
            </button>
          )}
          {isMine && o.status === 'accepted' && (
            <button onClick={() => unclaim(o)} disabled={busy === busyKey}
              className="px-4 py-3.5 border border-white/12 text-[10px] font-bold uppercase tracking-[0.15em] text-white/35 hover:border-white/30 hover:text-white/60 transition-colors disabled:opacity-30">
              {busy === busyKey ? '...' : 'Отдать'}
            </button>
          )}
          {isMine && nextStatus && (
            <button onClick={() => advance(o, nextStatus)} disabled={busy === busyKey}
              className="flex-1 py-3.5 border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 hover:border-white hover:text-white transition-colors disabled:opacity-30">
              {busy === busyKey ? '...' : NEXT_LABEL[nextStatus]}
            </button>
          )}
          {isMine && o.status === 'ready' && (
            <div className="flex-1 py-3.5 border border-white/15 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 text-center">
              Готово — ожидает выдачи
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalActive = myAll.filter(o => ['accepted', 'sewing'].includes(o.status)).length;
  const totalDone = myAll.filter(o => o.status === 'ready').length;

  return (
    <div className="min-h-screen bg-black text-white">

      <nav className="bg-[#080808] border-b border-white/8 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-black tracking-[0.35em] uppercase">AVISHU</span>
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/20">Цех</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-white' : 'bg-white/15'}`} />
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/25">
              {wsConnected ? 'Live' : 'Нет связи'}
            </span>
          </div>
          <button onClick={signOut} className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/25 hover:text-white/60 transition-colors">
            Выйти
          </button>
        </div>
      </nav>

      <div className="border-b border-white/8 px-6 py-6 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-2">Рабочее место</p>
          <div className="flex items-baseline gap-4">
            <span className="text-5xl font-black leading-none">{myCount}</span>
            <span className="text-sm text-white/30 font-medium">
              {totalActive > 0 && `${totalActive} в работе`}
              {totalActive > 0 && totalDone > 0 && ' · '}
              {totalDone > 0 && `${totalDone} готово`}
            </span>
          </div>
        </div>
        <p className="text-xs text-white/20 font-medium pb-1">{user?.full_name}</p>
      </div>

      <div className="flex border-b border-white/8">
        {[
          { id: 'free', label: `Свободные${freeCount ? ` · ${freeCount}` : ''}` },
          { id: 'mine', label: `Мои${myCount ? ` · ${myCount}` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-4 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors border-b-2 ${
              tab === t.id ? 'border-white text-white' : 'border-transparent text-white/30 hover:text-white/55'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-xl mx-auto px-6 py-8 space-y-4">
        {tab === 'free' && (
          freeAll.length === 0
            ? <div className="py-24 text-center text-sm text-white/20">Свободных заказов нет</div>
            : freeAll.map(o => <OrderCard key={key(o)} o={o} />)
        )}
        {tab === 'mine' && (
          myAll.length === 0
            ? <div className="py-24 text-center text-sm text-white/20">Нет взятых заказов</div>
            : myAll.map(o => <OrderCard key={key(o)} o={o} />)
        )}
      </div>
    </div>
  );
}
