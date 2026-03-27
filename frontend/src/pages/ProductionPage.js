import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useOrderStore from '../stores/useOrderStore';

export default function ProductionPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { orders, loading, fetchOrders, updateStatus, connectWs, disconnectWs, wsConnected } = useOrderStore();
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    connectWs();
    fetchOrders();
    return () => disconnectWs();
  }, []);

  const signOut = () => { logout(); navigate('/'); };

  const startWork = async (o) => {
    setBusy(o.id);
    try { await updateStatus(o.id, 'sewing'); }
    catch (e) { alert(e.message); }
    finally { setBusy(null); }
  };

  const finish = async (o) => {
    setBusy(o.id);
    try {
      await updateStatus(o.id, 'ready');
      setDone(o.id);
      setTimeout(() => setDone(null), 3000);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  const queue = orders.filter(o => o.status === 'accepted');
  const active = orders.filter(o => o.status === 'sewing');
  const total = queue.length + active.length;

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
              {wsConnected ? 'Подключён' : 'Нет связи'}
            </span>
          </div>
          <button onClick={signOut} className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/25 hover:text-white/60 transition-colors">
            Выйти
          </button>
        </div>
      </nav>

      <div className="border-b border-white/8 px-6 py-6 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-2">Очередь</p>
          <div className="flex items-baseline gap-4">
            <span className="text-6xl font-black leading-none">{total}</span>
            <span className="text-sm text-white/30 font-medium">
              {queue.length > 0 && `${queue.length} ожидают`}
              {queue.length > 0 && active.length > 0 && ' · '}
              {active.length > 0 && `${active.length} в пошиве`}
            </span>
          </div>
        </div>
        <p className="text-xs text-white/20 font-medium pb-1">
          {user?.full_name}
        </p>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8 space-y-8">

        {active.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold tracking-[0.45em] uppercase text-white/30 mb-5">В пошиве</p>
            <div className="space-y-4">
              {active.map(o => (
                <div key={o.id} className="border border-white/15 bg-[#080808]">
                  <div className="px-6 pt-6 pb-5 border-b border-white/8">
                    <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/30 mb-1.5">
                      Заказ #{o.id}{o.client ? ` · ${o.client.name}` : ''}
                    </p>
                    <h2 className="text-xl font-black uppercase tracking-tight leading-tight">
                      {o.product?.name || `Изделие #${o.id}`}
                    </h2>
                    {o.quantity > 1 && (
                      <p className="text-xs text-white/35 font-medium mt-1">{o.quantity} штуки</p>
                    )}
                    {o.desiredDate && (
                      <p className="text-xs text-white/25 font-medium mt-1">
                        Срок: {new Date(o.desiredDate).toLocaleDateString('ru-RU')}
                      </p>
                    )}
                  </div>
                  <div className="p-5">
                    {done === o.id ? (
                      <div className="py-5 text-center border border-white/10 bg-white/[0.03]">
                        <p className="text-base font-black tracking-[0.2em] uppercase">✓ Готово</p>
                      </div>
                    ) : (
                      <button onClick={() => finish(o)} disabled={busy === o.id}
                        className="w-full py-6 bg-white text-black text-base font-black uppercase tracking-[0.25em] hover:bg-white/92 active:bg-white/85 transition-colors disabled:opacity-40">
                        {busy === o.id ? '...' : 'ЗАВЕРШИТЬ'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {queue.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold tracking-[0.45em] uppercase text-white/30 mb-5">Очередь</p>
            <div className="divide-y divide-white/6">
              {queue.map((o, i) => (
                <div key={o.id} className="py-5 flex items-center gap-5">
                  <span className="text-4xl font-black text-white/10 w-10 flex-shrink-0 text-center leading-none">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold uppercase tracking-wide">
                      {o.product?.name || `Заказ #${o.id}`}
                    </p>
                    <p className="text-[10px] text-white/30 font-medium mt-0.5">
                      #{o.id}{o.client?.name ? ` · ${o.client.name}` : ''}
                      {o.quantity > 1 ? ` · ${o.quantity} шт.` : ''}
                    </p>
                  </div>
                  <button onClick={() => startWork(o)}
                    disabled={busy === o.id || active.length > 0}
                    className="flex-shrink-0 px-5 py-3 border border-white/15 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 hover:border-white/40 hover:text-white/80 transition-colors disabled:opacity-20">
                    {busy === o.id ? '...' : 'Начать'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && total === 0 && (
          <div className="py-24 text-center">
            <p className="text-7xl font-black text-white/6 mb-4">0</p>
            <p className="text-sm text-white/20 font-medium uppercase tracking-widest">Заказов нет</p>
          </div>
        )}

        {loading && (
          <div className="py-16 text-center text-xs text-white/20 tracking-widest uppercase">Загрузка</div>
        )}
      </div>
    </div>
  );
}
