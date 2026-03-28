import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useOrderStore from '../stores/useOrderStore';
import { api, BASE_URL } from '../api';
import BottomNav, { Icons } from '../components/BottomNav';

const STEPS = [
  { key: 'placed',    label: 'Оформлен',  desc: 'Ожидает подтверждения' },
  { key: 'accepted',  label: 'Принят',    desc: 'Передан в производство' },
  { key: 'sewing',    label: 'Пошив',     desc: 'Изделие шьётся' },
  { key: 'ready',     label: 'Готово',    desc: 'Готово к выдаче' },
  { key: 'delivered', label: 'Доставлен', desc: 'Передано клиенту' },
];

const CUSTOM_STEPS = [
  { key: 'pending_review',  label: 'На рассмотрении', desc: 'Менеджер изучает заказ' },
  { key: 'pending_payment', label: 'Ожидает оплаты',  desc: 'Менеджер назначил цену' },
  { key: 'placed',          label: 'Оформлен',         desc: 'Ожидает подтверждения' },
  { key: 'accepted',        label: 'Принят',           desc: 'Передан в производство' },
  { key: 'sewing',          label: 'Пошив',            desc: 'Изделие шьётся' },
  { key: 'ready',           label: 'Готово',           desc: 'Готово к выдаче' },
  { key: 'delivered',       label: 'Доставлен',        desc: 'Передано клиенту' },
];

const fmt = (n) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

const fmtDate = (s) =>
  s ? new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';

const CAT_RU = {
  outerwear: 'Верхняя одежда',
  jackets:   'Жакеты',
  dresses:   'Платья',
  trousers:  'Брюки',
  tops:      'Блузы',
};

function Thumb({ imageUrl, name, className = '' }) {
  return imageUrl
    ? <img src={`${BASE_URL}${imageUrl}`} alt={name} className={`object-cover ${className}`} />
    : <div className={`bg-[#111] flex items-center justify-center ${className}`}>
        <span className="text-white/10 font-black text-2xl">{(name || 'A')[0]}</span>
      </div>;
}

function QtyRow({ qty, onChange }) {
  return (
    <div className="flex items-center border border-white/12">
      <button onClick={() => onChange(qty - 1)} className="w-8 h-8 text-white/40 hover:text-white transition-colors text-sm">−</button>
      <span className="w-8 text-center text-sm font-bold">{qty}</span>
      <button onClick={() => onChange(qty + 1)} className="w-8 h-8 text-white/40 hover:text-white transition-colors text-sm">+</button>
    </div>
  );
}

function ProductTile({ p, onOpen }) {
  return (
    <button onClick={() => onOpen(p)} className="text-left w-full group">
      <div className="aspect-[2/3] bg-[#0d0d0d] border border-white/6 group-hover:border-white/20 transition-all duration-200 mb-3 overflow-hidden relative">
        {p.imageUrl
          ? <img src={`${BASE_URL}${p.imageUrl}`} alt={p.name}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
          : <>
              <p className="absolute top-3 left-3 text-[8px] font-bold tracking-[0.45em] uppercase text-white/15">AVISHU</p>
              <p className="absolute text-[80px] font-black text-white/[0.025] leading-none bottom-1 right-1 select-none">
                {(p.name || '').split(' ').pop()?.[0] || 'A'}
              </p>
              <p className="absolute bottom-3 left-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25">
                {CAT_RU[p.category] || p.category}
              </p>
            </>
        }
        {p.isPreorder && (
          <span className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider border border-white/20 bg-black/60 text-white/50 px-2 py-0.5">
            Предзаказ
          </span>
        )}
      </div>
      <p className="text-[11px] font-black uppercase tracking-wide leading-tight mb-1">{p.name}</p>
      <div className="flex items-center justify-between">
        <p className="text-sm font-black">{fmt(p.price)}</p>
        <p className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">
          {p.isPreorder ? 'Предзаказ' : p.inStock ? 'В наличии' : 'Нет'}
        </p>
      </div>
    </button>
  );
}

function ShopModal({ item, onClose, onAddToCart }) {
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState('');
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => { const t = setTimeout(() => setOpen(true), 15); return () => clearTimeout(t); }, []);

  const close = () => { setOpen(false); setTimeout(onClose, 280); };

  const add = () => {
    onAddToCart(item, qty, item.isPreorder ? date || null : null);
    setAdded(true);
    setTimeout(close, 900);
  };

  return (
    <div className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center transition-all duration-300 ${open ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}`}
      onClick={close}>
      <div className={`bg-[#080808] border border-white/10 w-full max-w-sm transition-all duration-300 ${open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        onClick={e => e.stopPropagation()}>

        <div className="h-52 relative overflow-hidden border-b border-white/6">
          <Thumb imageUrl={item.imageUrl} name={item.name} className="absolute inset-0 w-full h-full" />
          {!item.imageUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <p className="text-[8px] font-bold tracking-[0.5em] uppercase text-white/15">AVISHU</p>
              <p className="text-[9px] font-semibold tracking-[0.3em] uppercase text-white/30">{CAT_RU[item.category] || item.category}</p>
            </div>
          )}
        </div>

        <div className="p-7">
          <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/25 mb-1">{CAT_RU[item.category] || item.category}</p>
          <h2 className="text-xl font-black uppercase tracking-tight leading-tight mb-1">{item.name}</h2>
          <p className="text-2xl font-black mb-4">{fmt(item.price)}</p>

          {item.description && (
            <p className="text-sm text-white/35 leading-relaxed pb-4 mb-4 border-b border-white/6">{item.description}</p>
          )}

          {item.isPreorder && (
            <div className="mb-4">
              <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Желаемая дата</p>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-transparent border-b border-white/15 text-white/80 pb-2.5 text-sm outline-none focus:border-white/40 transition-colors" />
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <span className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30">Количество</span>
            <QtyRow qty={qty} onChange={v => setQty(Math.max(1, v))} />
          </div>

          <div className="flex gap-2.5">
            <button onClick={close}
              className="px-5 py-4 border border-white/10 text-white/30 text-xs hover:text-white/60 hover:border-white/20 transition-colors">
              ←
            </button>
            <button onClick={add}
              className={`flex-1 text-xs font-black uppercase tracking-[0.2em] py-4 transition-colors ${
                added ? 'bg-white/15 text-white/60' : 'bg-white text-black hover:bg-white/92 active:bg-white/85'
              }`}>
              {added ? '✓ Добавлено' : `В корзину · ${fmt(item.price * qty)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// deploy 5
function CartCheckoutModal({ items, onClose, onSuccess }) {
  const [step, setStep] = useState('card');
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);

  const { checkoutCart } = useOrderStore();

  useEffect(() => { const t = setTimeout(() => setOpen(true), 15); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (step !== 'success') return;
    const t = setTimeout(() => { setOpen(false); setTimeout(onSuccess, 280); }, 4000);
    return () => clearTimeout(t);
  }, [step, onSuccess]);

  const close = () => {
    if (step === 'processing') return;
    setOpen(false);
    setTimeout(onClose, 280);
  };

  const fmtNum = v => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ');
  const fmtExp = v => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
  const expOk = e => {
    const [mm, yy] = e.split('/');
    if (!mm || !yy || yy.length < 2) return false;
    const now = new Date();
    return new Date(2000 + parseInt(yy), parseInt(mm) - 1, 28) >= new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const total = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  const pay = async () => {
    if (cardNum.replace(/\s/g, '').length < 16) { setErr('Введите полный номер карты'); return; }
    if (!expOk(expiry)) { setErr('Срок действия карты истёк или введён неверно'); return; }
    if (cvv.length < 3) { setErr('Введите CVV'); return; }
    setErr('');
    setStep('processing');
    await new Promise(r => setTimeout(r, 2400));
    const res = await checkoutCart();
    setResult(res);
    setStep('success');
  };

  return (
    <div className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center transition-all duration-300 ${open ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}`}
      onClick={close}>
      <div className={`bg-[#080808] border border-white/10 w-full max-w-sm transition-all duration-300 ${open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        onClick={e => e.stopPropagation()}>

        {step === 'card' && (
          <div className="p-7">
            <div className="mb-6">
              <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-1">Оплата заказа</p>
              <p className="text-2xl font-black">{fmt(total)}</p>
              <p className="text-[10px] text-white/30 mt-1">{items.length} поз. · {totalQty} шт.</p>
            </div>

            <div className="space-y-1 mb-5 divide-y divide-white/5 border border-white/8">
              {items.map(i => (
                <div key={i.product.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Thumb imageUrl={i.product.imageUrl} name={i.product.name} className="w-8 h-10 flex-shrink-0" />
                  <p className="flex-1 text-xs font-bold uppercase tracking-wide leading-tight min-w-0 truncate">{i.product.name}</p>
                  <p className="text-xs font-black flex-shrink-0">{fmt(i.product.price * i.qty)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-5 mb-6">
              <div>
                <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Номер карты</p>
                <input value={cardNum} onChange={e => setCardNum(fmtNum(e.target.value))}
                  placeholder="0000 0000 0000 0000" inputMode="numeric"
                  className="w-full bg-transparent border-b border-white/12 text-white pb-2.5 text-base font-mono tracking-[0.15em] outline-none focus:border-white/45 transition-colors placeholder-white/12" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Срок</p>
                  <input value={expiry} onChange={e => setExpiry(fmtExp(e.target.value))}
                    placeholder="ММ/ГГ" inputMode="numeric"
                    className="w-full bg-transparent border-b border-white/12 text-white pb-2.5 text-sm font-mono outline-none focus:border-white/45 transition-colors placeholder-white/12" />
                </div>
                <div>
                  <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">CVV</p>
                  <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="•••" type="password" inputMode="numeric"
                    className="w-full bg-transparent border-b border-white/12 text-white pb-2.5 text-sm font-mono outline-none focus:border-white/45 transition-colors placeholder-white/12" />
                </div>
              </div>
            </div>

            {err && <p className="text-xs text-red-400/80 mb-4">{err}</p>}

            <div className="flex gap-2.5">
              <button onClick={close}
                className="px-5 py-4 border border-white/10 text-white/30 text-xs hover:text-white/60 hover:border-white/20 transition-colors">
                ←
              </button>
              <button onClick={pay}
                className="flex-1 bg-white text-black text-xs font-black uppercase tracking-[0.2em] py-4 hover:bg-white/92 transition-colors">
                Оплатить · {fmt(total)}
              </button>
            </div>

          </div>
        )}

        {step === 'processing' && (
          <div className="py-20 flex flex-col items-center gap-8">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
              <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.35em]">Обработка</p>
              <p className="text-[10px] text-white/30 mt-2 tracking-wider">Пожалуйста, подождите</p>
            </div>
          </div>
        )}

        {step === 'success' && result && (
          <div className="py-12 px-7 flex flex-col items-center gap-5">
            <div className="w-14 h-14 border-2 border-white flex items-center justify-center">
              <span className="text-xl font-black">✓</span>
            </div>
            <div className="text-center">
              <p className="text-base font-black uppercase tracking-[0.25em] mb-1">Оплачено</p>
              <p className="text-2xl font-black">{fmt(total)}</p>
            </div>
            <div className="w-full space-y-1">
              {result.succeeded.map(o => (
                <div key={o.id} className="flex items-center justify-between px-4 py-2 border border-white/8 bg-white/[0.02]">
                  <p className="text-xs font-bold uppercase tracking-wide truncate">{o.product?.name || `#${o.id}`}</p>
                  <span className="text-[10px] text-white/40 ml-2">✓</span>
                </div>
              ))}
              {result.failed.map(f => (
                <div key={f.product.id} className="flex items-center justify-between px-4 py-2 border border-red-500/20 bg-red-500/[0.04]">
                  <p className="text-xs font-bold uppercase tracking-wide truncate text-red-400/80">{f.product.name}</p>
                  <span className="text-[10px] text-red-400/60 ml-2">{f.reason}</span>
                </div>
              ))}
            </div>
            <div className="w-full border border-white/10 bg-white/[0.02] px-5 py-4 text-center">
              <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-1">Начислено</p>
              <p className="text-3xl font-black">+{result.succeeded.reduce((s, o) => s + (o.quantity || 1) * 100, 0)}</p>
              <p className="text-[10px] text-white/30 mt-1 uppercase tracking-widest">AVISHU Points</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomOrderModal({ onClose, onDone }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => { const t = setTimeout(() => setOpen(true), 15); return () => clearTimeout(t); }, []);
  const close = () => { if (busy) return; setOpen(false); setTimeout(onClose, 280); };

  const submit = async () => {
    if (!title.trim()) { setErr('Укажите название'); return; }
    setErr('');
    setBusy(true);
    try {
      const d = await api.customOrders.create({ title: title.trim(), description: description.trim() || undefined });
      if (photo) {
        try { await api.customOrders.uploadPhoto(d.order.id, photo); } catch {}
      }
      onDone(d.order);
      setOpen(false);
      setTimeout(onClose, 280);
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
            <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-1">Свой заказ</p>
            <p className="text-xs text-white/35">Опишите что хотите пошить. Менеджер свяжется с вами и назначит цену.</p>
          </div>

          <div>
            <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Название *</p>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Напр: Пальто с поясом, размер M"
              className="w-full bg-transparent border-b border-white/12 text-white pb-2.5 text-sm outline-none focus:border-white/40 transition-colors placeholder-white/15" />
          </div>

          <div>
            <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Детали</p>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Материал, цвет, особые пожелания..."
              rows={3}
              className="w-full bg-transparent border-b border-white/12 text-white/80 pb-2.5 text-sm outline-none focus:border-white/40 transition-colors placeholder-white/15 resize-none" />
          </div>

          <div>
            <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Фото (опционально)</p>
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="border border-white/12 group-hover:border-white/30 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors">
                {photo ? photo.name : 'Прикрепить'}
              </span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setPhoto(f);
                  setPhotoPreview(URL.createObjectURL(f));
                }} />
              {photoPreview && <img src={photoPreview} alt="" className="h-12 w-9 object-cover border border-white/10" />}
            </label>
          </div>

          {err && <p className="text-xs text-red-400/80">{err}</p>}

          <div className="flex gap-2.5">
            <button onClick={close}
              className="px-5 py-4 border border-white/10 text-white/30 text-xs hover:text-white/60 hover:border-white/20 transition-colors">
              ←
            </button>
            <button onClick={submit} disabled={busy}
              className="flex-1 bg-white text-black text-xs font-black uppercase tracking-[0.2em] py-4 hover:bg-white/92 transition-colors disabled:opacity-40">
              {busy ? '...' : 'Отправить заказ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomPayModal({ order, onClose, onDone }) {
  const [step, setStep] = useState('card');
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => { const t = setTimeout(() => setOpen(true), 15); return () => clearTimeout(t); }, []);

  const close = () => { if (step === 'processing') return; setOpen(false); setTimeout(onClose, 280); };

  const fmtNum = v => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ');
  const fmtExp = v => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
  const expOk = e => {
    const [mm, yy] = e.split('/');
    if (!mm || !yy || yy.length < 2) return false;
    const now = new Date();
    return new Date(2000 + parseInt(yy), parseInt(mm) - 1, 28) >= new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const pay = async () => {
    if (cardNum.replace(/\s/g, '').length < 16) { setErr('Введите полный номер карты'); return; }
    if (!expOk(expiry)) { setErr('Срок действия карты истёк или введён неверно'); return; }
    if (cvv.length < 3) { setErr('Введите CVV'); return; }
    setErr('');
    setStep('processing');
    await new Promise(r => setTimeout(r, 2400));
    try {
      const d = await api.customOrders.pay(order.id);
      onDone(d.order);
      setStep('success');
      setTimeout(() => { setOpen(false); setTimeout(onClose, 280); }, 3000);
    } catch (e) {
      setErr(e.message);
      setStep('card');
    }
  };

  const fmtPrice = (n) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

  return (
    <div className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center transition-all duration-300 ${open ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}`}
      onClick={close}>
      <div className={`bg-[#080808] border border-white/10 w-full max-w-sm transition-all duration-300 ${open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        onClick={e => e.stopPropagation()}>

        {step === 'card' && (
          <div className="p-7">
            <div className="mb-6">
              <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-1">Оплата заказа</p>
              <p className="text-sm font-black uppercase tracking-wide mb-2">{order.title}</p>
              <p className="text-2xl font-black">{fmtPrice(order.price)}</p>
            </div>
            <div className="space-y-5 mb-6">
              <div>
                <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Номер карты</p>
                <input value={cardNum} onChange={e => setCardNum(fmtNum(e.target.value))}
                  placeholder="0000 0000 0000 0000" inputMode="numeric"
                  className="w-full bg-transparent border-b border-white/12 text-white pb-2.5 text-base font-mono tracking-[0.15em] outline-none focus:border-white/45 transition-colors placeholder-white/12" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Срок</p>
                  <input value={expiry} onChange={e => setExpiry(fmtExp(e.target.value))}
                    placeholder="ММ/ГГ" inputMode="numeric"
                    className="w-full bg-transparent border-b border-white/12 text-white pb-2.5 text-sm font-mono outline-none focus:border-white/45 transition-colors placeholder-white/12" />
                </div>
                <div>
                  <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">CVV</p>
                  <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="•••" type="password" inputMode="numeric"
                    className="w-full bg-transparent border-b border-white/12 text-white pb-2.5 text-sm font-mono outline-none focus:border-white/45 transition-colors placeholder-white/12" />
                </div>
              </div>
            </div>
            {err && <p className="text-xs text-red-400/80 mb-4">{err}</p>}
            <div className="flex gap-2.5">
              <button onClick={close}
                className="px-5 py-4 border border-white/10 text-white/30 text-xs hover:text-white/60 hover:border-white/20 transition-colors">←</button>
              <button onClick={pay}
                className="flex-1 bg-white text-black text-xs font-black uppercase tracking-[0.2em] py-4 hover:bg-white/92 transition-colors">
                Оплатить · {fmtPrice(order.price)}
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-20 flex flex-col items-center gap-8">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
              <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.35em]">Обработка</p>
              <p className="text-[10px] text-white/30 mt-2 tracking-wider">Пожалуйста, подождите</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-12 px-7 flex flex-col items-center gap-5">
            <div className="w-14 h-14 border-2 border-white flex items-center justify-center">
              <span className="text-xl font-black">✓</span>
            </div>
            <div className="text-center">
              <p className="text-base font-black uppercase tracking-[0.25em] mb-1">Оплачено</p>
              <p className="text-sm text-white/50">{order.title}</p>
              <p className="text-2xl font-black mt-2">{fmtPrice(order.price)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { orders, customOrders, loading: ordersLoading, fetchOrders, fetchCustomOrders,
    updateCustomOrder, connectWs, disconnectWs,
    cart, addToCart, removeFromCart, setCartQty } = useOrderStore();
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [checkout, setCheckout] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customPayOrder, setCustomPayOrder] = useState(null);

  useEffect(() => {
    connectWs();
    fetchOrders();
    fetchCustomOrders();
    api.products.list().then(d => setProducts(d.products || [])).finally(() => setLoading(false));
    return () => disconnectWs();
  }, []);


  const mine = orders.filter(o => o.clientId === user?.id);
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const totalPts = mine.length * 100;

  const allOrders = [
    ...mine.map(o => ({ ...o, isCustom: false })),
    ...customOrders.map(o => ({ ...o, isCustom: true })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="min-h-screen bg-black text-white max-w-[430px] mx-auto">

      <nav className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/8 flex items-center justify-between px-5 py-4">
        <span className="text-xs font-black tracking-[0.35em] uppercase">AVISHU</span>
        <button onClick={() => navigate('/app/profile')}
          className="group w-8 h-8 border border-white/12 flex items-center justify-center hover:border-white/35 transition-colors">
          <svg width="15" height="15" viewBox="0 0 17 17" fill="none" className="text-white/40 group-hover:text-white/70 transition-colors">
            <circle cx="8.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="0.85"/>
            <path d="M1 16.5c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5" stroke="currentColor" strokeWidth="0.85" strokeLinecap="square"/>
          </svg>
        </button>
      </nav>

      {tab === 'home' && (
        <div className="px-5 pt-8 pb-28">
          <div className="mb-8">
            <p className="text-[9px] font-semibold tracking-[0.5em] uppercase text-white/20 mb-2">Добро пожаловать</p>
            <h1 className="text-4xl font-black uppercase tracking-tight leading-none">{user?.full_name?.split(' ')[0] || 'Клиент'}</h1>
          </div>

          <div className="border border-white/8 bg-[#080808] px-5 py-5 mb-4">
            <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-4">Лояльность</p>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-white/50 mb-0.5">AVISHU Member</p>
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
                  {Math.max(0, 8 - mine.length)} заказов до Silver
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">{totalPts}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-wider">pts</p>
              </div>
            </div>
            <div className="h-px bg-white/8 overflow-hidden">
              <div className="h-full bg-white/45 transition-all duration-700"
                style={{ width: `${Math.min(100, mine.length / 8 * 100)}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <button onClick={() => setTab('catalog')}
              className="border border-white/10 bg-[#080808] py-5 flex flex-col items-center gap-2 hover:border-white/25 transition-colors">
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none" className="text-white/40">
                <rect x="0.5" y="0.5" width="6.5" height="6.5" stroke="currentColor" strokeWidth="0.75"/>
                <rect x="10" y="0.5" width="6.5" height="6.5" stroke="currentColor" strokeWidth="0.75"/>
                <rect x="0.5" y="10" width="6.5" height="6.5" stroke="currentColor" strokeWidth="0.75"/>
                <rect x="10" y="10" width="6.5" height="6.5" stroke="currentColor" strokeWidth="0.75"/>
              </svg>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Каталог</span>
            </button>
            <button onClick={() => setTab('orders')}
              className="border border-white/10 bg-[#080808] py-5 flex flex-col items-center gap-2 hover:border-white/25 transition-colors">
              <div className="relative">
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none" className="text-white/40">
                  <rect x="1" y="1" width="15" height="15" stroke="currentColor" strokeWidth="0.75"/>
                  <path d="M4.5 5.5h8M4.5 8.5h8M4.5 11.5h5" stroke="currentColor" strokeWidth="0.75" strokeLinecap="square"/>
                </svg>
                {allOrders.length > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <span className="text-[6px] font-black text-black">{allOrders.length > 9 ? '9+' : allOrders.length}</span>
                  </div>
                )}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Заказы</span>
            </button>
          </div>

          {allOrders.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-4">Последний заказ</p>
              <button className="w-full text-left border border-white/8 bg-[#080808] px-4 py-4 hover:border-white/20 transition-colors"
                onClick={() => setTab('orders')}>
                {(() => {
                  const o = allOrders[0];
                  const steps = o.isCustom ? CUSTOM_STEPS : STEPS;
                  const step = steps.find(s => s.key === o.status) || steps[0];
                  return (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide">
                          {o.isCustom ? o.title : (o.product?.name || `Заказ #${o.id}`)}
                        </p>
                        <p className="text-[10px] text-white/30 mt-0.5">{step.label}</p>
                      </div>
                      <span className="text-white/20 text-xs">→</span>
                    </div>
                  );
                })()}
              </button>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-white/8">
            <button onClick={() => setShowCustomForm(true)}
              className="w-full border border-white/12 py-5 text-xs font-black uppercase tracking-[0.3em] text-white/40 hover:border-white/30 hover:text-white/70 transition-all">
              + Заказать своё изделие
            </button>
          </div>
        </div>
      )}

      {tab === 'catalog' && (
        <div className="px-5 pt-8 pb-28">
          <div className="mb-8">
            <p className="text-[9px] font-semibold tracking-[0.5em] uppercase text-white/20 mb-2">Коллекция 2024</p>
            <h1 className="text-5xl font-black uppercase tracking-tight leading-none">AVISHU</h1>
            <p className="text-[10px] font-semibold tracking-[0.35em] uppercase text-white/22 mt-2">Premium Fashion · Kazakhstan</p>
          </div>
          {loading ? (
            <div className="py-20 text-center text-xs text-white/20 tracking-widest uppercase">Загрузка</div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center text-sm text-white/20">Товаров нет. Добавьте через Admin.</div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8">
              {products.map(p => (
                <ProductTile key={p.id} p={p} onOpen={setSelected} />
              ))}
            </div>
          )}
          <div className="mt-10 pt-8 border-t border-white/8">
            <button onClick={() => setShowCustomForm(true)}
              className="w-full border border-white/12 py-5 text-xs font-black uppercase tracking-[0.3em] text-white/40 hover:border-white/30 hover:text-white/70 transition-all">
              + Заказать своё изделие
            </button>
            <p className="text-[9px] text-center text-white/20 mt-3 tracking-[0.2em] uppercase">
              Индивидуальный пошив по вашим параметрам
            </p>
          </div>
        </div>
      )}

      {tab === 'cart' && (
        <div className="px-5 py-8 pb-28">
          {cart.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-4xl font-black text-white/6 mb-4">0</p>
              <p className="text-sm text-white/25 mb-6">Корзина пуста</p>
              <button onClick={() => setTab('catalog')}
                className="text-xs font-bold uppercase tracking-[0.2em] text-white underline underline-offset-4 hover:text-white/60 transition-colors">
                В каталог
              </button>
            </div>
          ) : (
            <>
              <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-5">Корзина</p>
              <div className="space-y-0 divide-y divide-white/6 border border-white/8 mb-6">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-4 p-4">
                    <Thumb imageUrl={item.product.imageUrl} name={item.product.name}
                      className="w-12 h-16 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide leading-tight truncate">{item.product.name}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{fmt(item.product.price)} × {item.qty}</p>
                      {item.desiredDate && (
                        <p className="text-[9px] text-white/25 mt-0.5">Дата: {item.desiredDate}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-sm font-black">{fmt(item.product.price * item.qty)}</p>
                      <div className="flex items-center gap-2">
                        <QtyRow qty={item.qty} onChange={v => setCartQty(item.product.id, v)} />
                        <button onClick={() => removeFromCart(item.product.id)}
                          className="text-white/20 hover:text-red-400 transition-colors text-sm leading-none ml-1">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-white/8 px-5 py-4 flex items-center justify-between mb-5">
                <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/40">Итого</span>
                <span className="text-xl font-black">{fmt(cartTotal)}</span>
              </div>

              <button onClick={() => setCheckout(true)}
                className="w-full bg-white text-black text-xs font-black uppercase tracking-[0.3em] py-5 hover:bg-white/92 active:bg-white/85 transition-colors">
                Оформить · {fmt(cartTotal)}
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="px-5 py-8 pb-28">
          <div className="border border-white/8 bg-[#080808] px-5 py-5 mb-8">
            <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-4">Лояльность</p>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-white/50 mb-0.5">AVISHU Member</p>
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
                  {Math.max(0, 8 - mine.length)} заказов до Silver
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">{totalPts}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-wider">pts</p>
              </div>
            </div>
            <div className="h-px bg-white/8 overflow-hidden">
              <div className="h-full bg-white/45 transition-all duration-700"
                style={{ width: `${Math.min(100, mine.length / 8 * 100)}%` }} />
            </div>
          </div>

          <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-5">Мои заказы</p>

          {ordersLoading ? (
            <div className="py-16 text-center text-xs text-white/20 tracking-widest uppercase">Загрузка</div>
          ) : allOrders.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-white/25 mb-6">Заказов пока нет</p>
              <button onClick={() => setTab('catalog')}
                className="text-xs font-bold uppercase tracking-[0.2em] text-white underline underline-offset-4 hover:text-white/60 transition-colors">
                В каталог
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {allOrders.map(o => {
                const steps = o.isCustom ? CUSTOM_STEPS : STEPS;
                const idx = steps.findIndex(s => s.key === o.status);
                const step = steps[idx] || steps[0];
                const expanded = expandedOrder === (o.isCustom ? 'c' + o.id : o.id);
                const toggleKey = o.isCustom ? 'c' + o.id : o.id;
                return (
                  <div key={toggleKey} className="border border-white/8 bg-[#080808] overflow-hidden">
                    <button className="w-full text-left" onClick={() => setExpandedOrder(expanded ? null : toggleKey)}>
                      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/6">
                        {!o.isCustom && (
                          <Thumb imageUrl={o.product?.imageUrl} name={o.product?.name || ''}
                            className="w-10 h-14 flex-shrink-0" />
                        )}
                        {o.isCustom && (
                          <div className="w-10 h-14 flex-shrink-0 bg-[#111] flex items-center justify-center border border-white/8">
                            <span className="text-white/20 text-xs font-black">C</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {o.isCustom && (
                            <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-white/25 border border-white/10 px-1.5 py-0.5 mr-1">Своё</span>
                          )}
                          <p className="text-sm font-black uppercase tracking-wide leading-tight truncate">
                            {o.isCustom ? o.title : (o.product?.name || `Заказ #${o.id}`)}
                          </p>
                          <p className="text-[10px] text-white/30 mt-0.5">
                            #{o.id} · {new Date(o.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                            {!o.isCustom && o.quantity > 1 ? ` · ${o.quantity} шт.` : ''}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {!o.isCustom && <p className="text-sm font-black">{fmt(o.totalPrice)}</p>}
                          {o.isCustom && o.price && <p className="text-sm font-black">{fmt(o.price)}</p>}
                          <p className="text-[9px] text-white/25 mt-1">{expanded ? '▲' : '▼'}</p>
                        </div>
                      </div>
                    </button>

                    {o.isCustom && o.status === 'pending_payment' && (
                      <div className="px-4 py-3 bg-white/[0.03] border-b border-white/6 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white/70">Назначена цена: {fmt(o.price)}</p>
                          <p className="text-[10px] text-white/35">Оплатите для продолжения</p>
                        </div>
                        <button onClick={() => setCustomPayOrder(o)}
                          className="bg-white text-black text-[10px] font-black uppercase tracking-[0.15em] px-4 py-2 hover:bg-white/92 transition-colors">
                          Оплатить
                        </button>
                      </div>
                    )}

                    {o.isCustom && o.status === 'pending_review' && (
                      <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/6">
                        <p className="text-[10px] text-white/35">Ожидает оценки менеджера</p>
                      </div>
                    )}

                    <div className="px-4 py-4">
                      <div className="relative mb-3">
                        <div className="absolute top-[3px] left-0 right-0 h-px bg-white/8" />
                        <div className="absolute top-[3px] left-0 h-px bg-white/35 transition-all duration-500"
                          style={{ width: `${idx / (steps.length - 1) * 100}%` }} />
                        <div className="relative flex justify-between">
                          {steps.map((s, i) => (
                            <div key={s.key} className={`w-[7px] h-[7px] rounded-full border transition-all ${
                              i <= idx ? 'bg-white border-white' : 'bg-black border-white/18'
                            }`} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.15em]">{step.label}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{step.desc}</p>
                        </div>
                        <p className="text-[9px] text-white/20 font-medium">{fmtDate(o.updatedAt)}</p>
                      </div>
                    </div>

                    {expanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-white/6 space-y-2.5">
                        {o.isCustom && o.photoUrl && (
                          <img src={`${BASE_URL}${o.photoUrl}`} alt="" className="w-full max-h-40 object-cover border border-white/8" />
                        )}
                        {o.isCustom && o.description && (
                          <p className="text-xs text-white/35 leading-relaxed">{o.description}</p>
                        )}
                        {!o.isCustom && o.product?.description && (
                          <p className="text-xs text-white/35 leading-relaxed">{o.product.description}</p>
                        )}
                        {!o.isCustom && o.product?.category && (
                          <p className="text-[10px] text-white/25">
                            {CAT_RU[o.product.category] || o.product.category}
                          </p>
                        )}
                        {o.desiredDate && (
                          <p className="text-[10px] text-white/30">
                            Желаемая дата: {new Date(o.desiredDate).toLocaleDateString('ru-RU')}
                          </p>
                        )}
                        {o.notes && (
                          <p className="text-[10px] text-white/30">Примечание: {o.notes}</p>
                        )}
                        <div className="pt-2 space-y-1">
                          {steps.map((s, i) => (
                            <div key={s.key} className={`flex items-center gap-3 ${i > idx ? 'opacity-25' : ''}`}>
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i <= idx ? 'bg-white' : 'bg-white/20'}`} />
                              <p className={`text-[10px] font-semibold uppercase tracking-wider ${i === idx ? 'text-white' : 'text-white/40'}`}>
                                {s.label}
                              </p>
                              <p className="text-[9px] text-white/25">{s.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selected && (
        <ShopModal
          item={selected}
          onClose={() => setSelected(null)}
          onAddToCart={(product, qty, date) => {
            addToCart(product, qty, date);
            setSelected(null);
            setTab('cart');
          }}
        />
      )}

      {checkout && (
        <CartCheckoutModal
          items={cart}
          onClose={() => setCheckout(false)}
          onSuccess={() => { setCheckout(false); setTab('orders'); }}
        />
      )}

      {showCustomForm && (
        <CustomOrderModal
          onClose={() => setShowCustomForm(false)}
          onDone={(order) => {
            updateCustomOrder(order);
            setShowCustomForm(false);
            setTab('orders');
          }}
        />
      )}

      {customPayOrder && (
        <CustomPayModal
          order={customPayOrder}
          onClose={() => setCustomPayOrder(null)}
          onDone={(updated) => {
            updateCustomOrder(updated);
            setCustomPayOrder(null);
          }}
        />
      )}

      <BottomNav items={[
        { id: 'home',    icon: Icons.home,  label: 'Главная', active: tab === 'home',    onClick: () => setTab('home') },
        { id: 'catalog', icon: Icons.grid,  label: 'Каталог', active: tab === 'catalog', onClick: () => setTab('catalog') },
        { id: 'cart',    icon: Icons.bag,   label: 'Корзина', active: tab === 'cart',    onClick: () => setTab('cart'), badge: cartCount },
        { id: 'orders',  icon: Icons.list,  label: 'Заказы',  active: tab === 'orders',  onClick: () => setTab('orders') },
      ]} />
    </div>
  );
}
