import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useOrderStore from '../stores/useOrderStore';
import { api } from '../api';

const STEPS = [
  { key: 'placed', label: 'Оформлен' },
  { key: 'accepted', label: 'Принят' },
  { key: 'sewing', label: 'Пошив' },
  { key: 'ready', label: 'Готов' },
  { key: 'delivered', label: 'Доставлен' },
];

const fmt = (n) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

function Modal({ item, onClose, onBuy }) {
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    setBusy(true);
    try {
      await onBuy({ productId: item.id, quantity: qty, desiredDate: date || undefined });
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="h-52 bg-[#111] flex items-center justify-center border-b border-white/8">
          <span className="text-xs font-bold tracking-[0.4em] uppercase text-white/15">AVISHU</span>
        </div>
        <div className="p-7">
          <p className="text-[10px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">{item.category}</p>
          <h2 className="text-xl font-black uppercase tracking-tight mb-1 leading-tight">{item.name}</h2>
          <p className="text-2xl font-black mb-5">{fmt(item.price)}</p>

          {item.description && (
            <p className="text-sm text-white/40 leading-relaxed mb-6 pb-6 border-b border-white/8">
              {item.description}
            </p>
          )}

          {item.isPreorder && (
            <div className="mb-5">
              <label className="block text-[10px] font-semibold tracking-[0.3em] uppercase text-white/35 mb-2">
                Желаемая дата
              </label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-transparent border border-white/15 text-white/80 px-4 py-3 text-sm outline-none focus:border-white/40 transition-colors" />
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/35">Количество</span>
            <div className="flex items-center border border-white/15">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 text-white/50 hover:text-white transition-colors">−</button>
              <span className="w-9 text-center text-sm font-bold">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 text-white/50 hover:text-white transition-colors">+</button>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="px-5 py-3.5 border border-white/12 text-white/35 text-xs font-semibold uppercase tracking-widest hover:border-white/25 hover:text-white/60 transition-colors">
              ←
            </button>
            <button onClick={buy} disabled={busy}
              className="flex-1 bg-white text-black text-xs font-black uppercase tracking-[0.18em] py-3.5 hover:bg-white/92 transition-colors disabled:opacity-40">
              {busy ? '...' : item.isPreorder ? 'Предзаказ' : 'Купить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { orders, fetchOrders, createOrder, connectWs, disconnectWs } = useOrderStore();
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('shop');
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    connectWs();
    fetchOrders();
    api.products.list().then(d => setProducts(d.products || [])).finally(() => setLoading(false));
    return () => disconnectWs();
  }, []);

  const signOut = () => { logout(); navigate('/'); };

  const placeOrder = async (payload) => {
    await createOrder(payload);
    setFlash(true);
    setTab('orders');
    setTimeout(() => setFlash(false), 4000);
  };

  const mine = orders.filter(o => o.clientId === user?.id);
  const stepIdx = (status) => STEPS.findIndex(s => s.key === status);

  return (
    <div className="min-h-screen bg-black text-white max-w-[420px] mx-auto">

      <nav className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/8 flex items-center justify-between px-5 py-4">
        <span className="text-xs font-black tracking-[0.35em] uppercase">AVISHU</span>
        <div className="flex items-center gap-5">
          <span className="text-xs text-white/35 hidden sm:block">{user?.full_name?.split(' ')[0]}</span>
          <button onClick={signOut} className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30 hover:text-white/70 transition-colors">
            Выйти
          </button>
        </div>
      </nav>

      <div className="flex border-b border-white/8">
        {[
          { id: 'shop', label: 'Каталог' },
          { id: 'orders', label: `Заказы${mine.length ? ` · ${mine.length}` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors border-b-2 ${
              tab === t.id ? 'border-white text-white' : 'border-transparent text-white/30 hover:text-white/55'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'shop' && (
        <div>
          <div className="h-64 bg-[#0c0c0c] border-b border-white/8 flex flex-col items-center justify-center gap-4">
            <p className="text-[9px] font-semibold tracking-[0.5em] uppercase text-white/25">Коллекция 2024</p>
            <h1 className="text-5xl font-black uppercase tracking-tight">AVISHU</h1>
            <p className="text-[10px] font-semibold tracking-[0.35em] uppercase text-white/25">Premium Fashion</p>
          </div>

          <div className="px-5 pt-8">
            <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/30 mb-5">Все позиции</p>
            {loading ? (
              <div className="py-20 text-center text-xs text-white/20 tracking-widest uppercase">Загрузка</div>
            ) : (
              <div className="divide-y divide-white/6">
                {products.map(p => (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className="w-full flex items-center justify-between py-5 text-left group hover:bg-white/[0.02] transition-colors -mx-1 px-1">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide mb-1 group-hover:text-white/85 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                        {p.isPreorder ? '— Предзаказ' : p.inStock ? 'В наличии' : 'Нет в наличии'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <span className="text-sm font-black text-white/85">{fmt(p.price)}</span>
                      <span className="text-white/20 group-hover:text-white/50 transition-colors text-base">→</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="px-5 py-8">
          {flash && (
            <div className="mb-6 px-5 py-4 border border-white/20 bg-white/[0.04] flex items-center gap-3">
              <span className="text-white/60 text-base">✓</span>
              <span className="text-sm font-semibold text-white/80">Заказ оформлен</span>
            </div>
          )}

          <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/30 mb-6">Мои заказы</p>

          {mine.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-white/25 mb-6">Заказов пока нет</p>
              <button onClick={() => setTab('shop')}
                className="text-xs font-bold uppercase tracking-[0.2em] text-white underline underline-offset-4 hover:text-white/60 transition-colors">
                Перейти в каталог
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {mine.map(o => {
                const idx = stepIdx(o.status);
                return (
                  <div key={o.id} className="border border-white/10 bg-[#080808]">
                    <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-white/6">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide leading-tight">
                          {o.product?.name || `Заказ #${o.id}`}
                        </p>
                        <p className="text-[10px] text-white/30 mt-1">
                          #{o.id} · {new Date(o.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })}
                        </p>
                      </div>
                      <span className="text-sm font-black ml-4 flex-shrink-0">{fmt(o.totalPrice)}</span>
                    </div>

                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        {STEPS.map((s, i) => (
                          <div key={s.key} className="flex-1 flex flex-col items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full transition-colors ${
                              i < idx ? 'bg-white/50' : i === idx ? 'bg-white' : 'bg-white/12'
                            }`} />
                            {i < STEPS.length - 1 && (
                              <div className={`absolute`} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="relative flex items-center mb-3">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full h-px bg-white/10" />
                        </div>
                        <div className="absolute inset-0 flex items-center">
                          <div className="h-px bg-white/40 transition-all" style={{ width: `${(idx / (STEPS.length - 1)) * 100}%` }} />
                        </div>
                        <div className="relative flex justify-between w-full">
                          {STEPS.map((s, i) => (
                            <div key={s.key} className={`w-2 h-2 rounded-full border transition-all ${
                              i <= idx ? 'bg-white border-white' : 'bg-black border-white/15'
                            }`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/70">
                        {STEPS[idx]?.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 border border-white/8 bg-[#080808] px-5 py-5">
            <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-4">Лояльность</p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white/60">AVISHU Member</span>
              <span className="text-xs font-black">{mine.length * 100} pts</span>
            </div>
            <div className="h-px bg-white/8 w-full overflow-hidden">
              <div className="h-full bg-white/60 transition-all duration-700" style={{ width: `${Math.min(100, mine.length * 12)}%` }} />
            </div>
            <p className="text-[10px] text-white/20 mt-2.5 uppercase tracking-wider font-medium">
              {Math.max(0, 8 - mine.length)} заказов до Silver
            </p>
          </div>
        </div>
      )}

      {selected && (
        <Modal item={selected} onClose={() => setSelected(null)} onBuy={placeOrder} />
      )}
    </div>
  );
}
