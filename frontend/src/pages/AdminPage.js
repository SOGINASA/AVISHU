import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useOrderStore from '../stores/useOrderStore';
import { api, BASE_URL } from '../api';
import BottomNav, { Icons } from '../components/BottomNav';

const NEXT = { placed: 'accepted', accepted: 'sewing', sewing: 'ready', ready: 'delivered' };

const STATUS = {
  placed:    { label: 'Новый',     dot: 'bg-white animate-pulse' },
  accepted:  { label: 'Принят',    dot: 'bg-white/60' },
  sewing:    { label: 'Пошив',     dot: 'bg-white/40' },
  ready:     { label: 'Готов',     dot: 'bg-white/70' },
  delivered: { label: 'Доставлен', dot: 'bg-white/15' },
};

const CATEGORIES = [
  { id: 'outerwear', label: 'Верхняя одежда' },
  { id: 'jackets',   label: 'Жакеты' },
  { id: 'dresses',   label: 'Платья' },
  { id: 'trousers',  label: 'Брюки' },
  { id: 'tops',      label: 'Блузы' },
];

const fmt = (n) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

const fmtDate = (s) =>
  new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const ROLE_LABEL = { client: 'Клиент', franchisee: 'Партнёр', production: 'Цех', admin: 'Адм' };

const emptyForm = { name: '', price: '', category: 'outerwear', description: '', isPreorder: false, inStock: true };

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
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'production' });
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [planModal, setPlanModal] = useState(null);
  const [planValue, setPlanValue] = useState('');
  const [planMonth, setPlanMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [planBusy, setPlanBusy] = useState(false);
  const [planErr, setPlanErr] = useState('');

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formBusy, setFormBusy] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

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

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const d = await api.products.list();
      setProducts(d.products || []);
    } catch {}
    finally { setProductsLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'products') loadProducts();
  }, [tab, loadUsers, loadProducts]);

  const signOut = () => { logout(); navigate('/'); };

  const advance = async (o) => {
    const next = NEXT[o.status];
    if (!next) return;
    setBusy(o.id);
    try { await updateStatus(o.id, next); }
    catch (e) { alert(e.message); }
    finally { setBusy(null); }
  };

  const createUser = async (e) => {
    e.preventDefault();
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      setCreateErr('Заполните все поля'); return;
    }
    setCreateErr('');
    setCreateBusy(true);
    try {
      await api.admin.createUser(newUser);
      setNewUser({ full_name: '', email: '', password: '', role: 'production' });
      setShowCreateUser(false);
      loadUsers();
    } catch (e) {
      setCreateErr(e.message);
    } finally {
      setCreateBusy(false);
    }
  };

  const toggleUser = async (u) => {
    try {
      if (u.is_active) await api.admin.deactivate(u.id);
      else await api.admin.activate(u.id);
      loadUsers();
    } catch {}
  };

  const openPlanModal = async (u) => {
    setPlanErr('');
    setPlanValue('');
    setPlanMonth(new Date().toISOString().slice(0, 7));
    setPlanModal(u);
    try {
      const d = await api.admin.getSalesPlan(u.id, new Date().toISOString().slice(0, 7));
      if (d.plan) setPlanValue(String(d.plan.target));
    } catch {}
  };

  const savePlan = async () => {
    if (!planValue || parseFloat(planValue) <= 0) { setPlanErr('Введите сумму плана'); return; }
    setPlanBusy(true);
    setPlanErr('');
    try {
      await api.admin.setSalesPlan(planModal.id, planMonth, parseFloat(planValue));
      setPlanModal(null);
    } catch (e) {
      setPlanErr(e.message);
    } finally {
      setPlanBusy(false);
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, price: String(p.price), category: p.category || 'outerwear', description: p.description || '', isPreorder: p.isPreorder || false, inStock: p.inStock !== false });
    setEditImageFile(null);
    setEditImagePreview(p.imageUrl ? `${BASE_URL}${p.imageUrl}` : null);
    setEditErr('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.price) { setEditErr('Название и цена обязательны'); return; }
    setEditBusy(true);
    try {
      let d = await api.products.update(editingId, {
        name: editForm.name.trim(),
        price: parseFloat(editForm.price),
        category: editForm.category,
        description: editForm.description.trim() || undefined,
        isPreorder: editForm.isPreorder,
        inStock: editForm.isPreorder ? false : editForm.inStock,
      });
      let product = d.product;
      if (editImageFile) {
        const upd = await api.products.uploadImage(editingId, editImageFile);
        product = upd.product;
      }
      setProducts(ps => ps.map(p => p.id === editingId ? product : p));
      setEditingId(null);
    } catch (e) {
      setEditErr(e.message);
    } finally {
      setEditBusy(false);
    }
  };

  const removeProduct = async (p) => {
    try {
      await api.products.remove(p.id);
      setProducts(ps => ps.filter(x => x.id !== p.id));
    } catch {}
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) { setFormErr('Название и цена обязательны'); return; }
    setFormErr('');
    setFormBusy(true);
    try {
      const d = await api.products.create({
        name: form.name.trim(),
        price: parseFloat(form.price),
        category: form.category,
        description: form.description.trim() || undefined,
        isPreorder: form.isPreorder,
        inStock: form.isPreorder ? false : form.inStock,
      });
      let product = d.product;
      if (imageFile) {
        try {
          const upd = await api.products.uploadImage(product.id, imageFile);
          product = upd.product;
        } catch {}
      }
      setProducts(ps => [product, ...ps]);
      setForm(emptyForm);
      setImageFile(null);
      setImagePreview(null);
      setShowForm(false);
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setFormBusy(false);
    }
  };

  const visible = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const totals = {
    revenue: orders.filter(o => o.status !== 'placed').reduce((s, o) => s + (o.totalPrice || 0), 0),
    fresh: orders.filter(o => o.status === 'placed').length,
    active: orders.filter(o => ['accepted', 'sewing'].includes(o.status)).length,
    done: orders.filter(o => o.status === 'ready').length,
  };

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

      <div className="max-w-4xl mx-auto px-6 py-8 pb-28">

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


        {tab === 'orders' && (
          <>
            <div className="flex gap-px bg-white/6 border border-white/6 mb-6 overflow-hidden">
              {[
                { id: 'all',       label: 'Все' },
                { id: 'placed',    label: 'Новые' },
                { id: 'accepted',  label: 'Приняты' },
                { id: 'sewing',    label: 'Пошив' },
                { id: 'ready',     label: 'Готовы' },
                { id: 'delivered', label: 'Готово' },
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

        {tab === 'products' && (
          <>
            <div className="mb-6">
              <button onClick={() => { setShowForm(f => !f); setFormErr(''); }}
                className="text-[10px] font-bold uppercase tracking-[0.2em] border border-white/12 px-5 py-2.5 hover:border-white/35 hover:text-white transition-colors text-white/45">
                {showForm ? '✕ Закрыть' : '+ Добавить товар'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={addProduct} className="border border-white/10 bg-[#080808] p-6 mb-8 space-y-5">
                <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25">Новый товар</p>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Название</p>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="AVISHU COAT NO.2"
                      className="w-full bg-transparent border-b border-white/12 text-white pb-2.5 text-sm outline-none focus:border-white/40 transition-colors placeholder-white/15" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Цена, ₸</p>
                    <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="450000" type="number" min="0"
                      className="w-full bg-transparent border-b border-white/12 text-white pb-2.5 text-sm outline-none focus:border-white/40 transition-colors placeholder-white/15" />
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Категория</p>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[#080808] border-b border-white/12 text-white/80 pb-2.5 text-sm outline-none focus:border-white/40 transition-colors">
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Описание</p>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Краткое описание изделия..."
                    rows={2}
                    className="w-full bg-transparent border-b border-white/12 text-white/80 pb-2.5 text-sm outline-none focus:border-white/40 transition-colors placeholder-white/15 resize-none" />
                </div>

                <div>
                  <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Фото товара</p>
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="border border-white/12 group-hover:border-white/30 transition-colors px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 group-hover:text-white/70">
                      {imageFile ? imageFile.name : 'Выбрать файл'}
                    </div>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setImageFile(f);
                        setImagePreview(URL.createObjectURL(f));
                      }} />
                    {imagePreview && (
                      <img src={imagePreview} alt="" className="h-16 w-12 object-cover border border-white/10" />
                    )}
                  </label>
                </div>

                <div className="flex items-center gap-8">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.isPreorder}
                      onChange={e => setForm(f => ({ ...f, isPreorder: e.target.checked, inStock: e.target.checked ? false : f.inStock }))}
                      className="w-4 h-4 border border-white/20 bg-transparent accent-white" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Предзаказ</span>
                  </label>
                  {!form.isPreorder && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.inStock}
                        onChange={e => setForm(f => ({ ...f, inStock: e.target.checked }))}
                        className="w-4 h-4 border border-white/20 bg-transparent accent-white" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">В наличии</span>
                    </label>
                  )}
                </div>

                {formErr && <p className="text-xs text-red-400/80">{formErr}</p>}

                <button type="submit" disabled={formBusy}
                  className="bg-white text-black text-xs font-black uppercase tracking-[0.25em] px-8 py-3.5 hover:bg-white/92 transition-colors disabled:opacity-40">
                  {formBusy ? '...' : 'Добавить'}
                </button>
              </form>
            )}

            {productsLoading ? (
              <div className="py-20 text-center text-xs text-white/20 tracking-widest uppercase">Загрузка</div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center text-sm text-white/20">Товаров нет</div>
            ) : (
              <div className="divide-y divide-white/6">
                {products.map(p => (
                  <div key={p.id}>
                    <div className="py-4 flex items-center gap-3">
                      {p.imageUrl && (
                        <img src={`${BASE_URL}${p.imageUrl}`} alt=""
                          className="w-8 h-11 object-cover flex-shrink-0 border border-white/8" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold uppercase tracking-wide truncate">{p.name}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">
                          {CATEGORIES.find(c => c.id === p.category)?.label || p.category}
                          {p.isPreorder ? ' · Предзаказ' : p.inStock ? ' · В наличии' : ' · Нет'}
                        </p>
                      </div>
                      <p className="text-sm font-black flex-shrink-0">{fmt(p.price)}</p>
                      <button onClick={() => editingId === p.id ? setEditingId(null) : startEdit(p)}
                        className={`text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 border transition-colors flex-shrink-0 ${
                          editingId === p.id ? 'border-white/30 text-white/60' : 'border-white/10 text-white/25 hover:border-white/30 hover:text-white/60'
                        }`}>
                        {editingId === p.id ? 'Закрыть' : 'Изменить'}
                      </button>
                      <button onClick={() => removeProduct(p)}
                        className="text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 border border-white/10 text-white/25 hover:border-red-500/40 hover:text-red-400 transition-colors flex-shrink-0">
                        Убрать
                      </button>
                    </div>

                    {editingId === p.id && (
                      <form onSubmit={saveEdit} className="bg-[#0a0a0a] border border-white/8 p-5 mb-2 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Название</p>
                            <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              className="w-full bg-transparent border-b border-white/12 text-white pb-2 text-sm outline-none focus:border-white/40 transition-colors" />
                          </div>
                          <div>
                            <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Цена, ₸</p>
                            <input value={editForm.price} type="number" onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                              className="w-full bg-transparent border-b border-white/12 text-white pb-2 text-sm outline-none focus:border-white/40 transition-colors" />
                          </div>
                        </div>

                        <div>
                          <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Категория</p>
                          <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full bg-[#0a0a0a] border-b border-white/12 text-white/80 pb-2 text-sm outline-none">
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </div>

                        <div>
                          <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Описание</p>
                          <textarea value={editForm.description} rows={2} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full bg-transparent border-b border-white/12 text-white/80 pb-2 text-sm outline-none focus:border-white/40 transition-colors resize-none" />
                        </div>

                        <div>
                          <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Фото</p>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <span className="border border-white/12 group-hover:border-white/30 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors">
                              {editImageFile ? editImageFile.name : 'Заменить фото'}
                            </span>
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                setEditImageFile(f);
                                setEditImagePreview(URL.createObjectURL(f));
                              }} />
                            {editImagePreview && (
                              <img src={editImagePreview} alt="" className="h-12 w-8 object-cover border border-white/10" />
                            )}
                          </label>
                        </div>

                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editForm.isPreorder}
                              onChange={e => setEditForm(f => ({ ...f, isPreorder: e.target.checked }))}
                              className="accent-white" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Предзаказ</span>
                          </label>
                          {!editForm.isPreorder && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={editForm.inStock}
                                onChange={e => setEditForm(f => ({ ...f, inStock: e.target.checked }))}
                                className="accent-white" />
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">В наличии</span>
                            </label>
                          )}
                        </div>

                        {editErr && <p className="text-xs text-red-400/80">{editErr}</p>}

                        <div className="flex gap-2.5">
                          <button type="button" onClick={() => setEditingId(null)}
                            className="px-5 py-2.5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors">
                            Отмена
                          </button>
                          <button type="submit" disabled={editBusy}
                            className="px-6 py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-[0.25em] hover:bg-white/92 transition-colors disabled:opacity-40">
                            {editBusy ? '...' : 'Сохранить'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'users' && (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              <button onClick={() => setShowCreateUser(v => !v)}
                className="px-5 py-2.5 border border-white/12 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 hover:text-white hover:border-white/35 transition-colors">
                {showCreateUser ? '✕ Скрыть форму' : '+ Добавить пользователя'}
              </button>
            </div>

            {showCreateUser && (
              <form onSubmit={createUser} className="border border-white/10 bg-[#080808] p-5 mb-6 space-y-3">
                <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-2">Новый пользователь</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={newUser.full_name} onChange={e => setNewUser(u => ({ ...u, full_name: e.target.value }))}
                    placeholder="ФИО" className="bg-transparent border border-white/12 px-3 py-2 text-sm text-white outline-none focus:border-white/35" />
                  <input value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                    placeholder="email@example.com" className="bg-transparent border border-white/12 px-3 py-2 text-sm text-white outline-none focus:border-white/35" />
                  <input value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                    placeholder="Пароль" type="password" className="bg-transparent border border-white/12 px-3 py-2 text-sm text-white outline-none focus:border-white/35" />
                  <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                    className="bg-transparent border border-white/12 px-3 py-2 text-sm text-white outline-none focus:border-white/35">
                    <option value="client">Клиент</option>
                    <option value="franchisee">Менеджер</option>
                    <option value="production">Швея</option>
                    <option value="admin">Админ</option>
                  </select>
                </div>
                {createErr && <p className="text-xs text-red-400/80">{createErr}</p>}
                <button type="submit" disabled={createBusy}
                  className="bg-white text-black text-xs font-black uppercase tracking-[0.25em] px-5 py-2.5 hover:bg-white/92 transition-colors disabled:opacity-40">
                  {createBusy ? 'Сохранение...' : 'Создать'}
                </button>
              </form>
            )}

            <div className="flex gap-3 mb-6">
              <input value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadUsers()}
                placeholder="Поиск по email или имени..."
                className="flex-1 bg-transparent border border-white/12 text-white/80 px-4 py-2.5 text-xs outline-none focus:border-white/35 transition-colors placeholder-white/20" />
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
                  <div key={u.id} className="py-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold uppercase tracking-wide ${u.is_active ? '' : 'line-through text-white/30'}`}>
                        {u.full_name || u.nickname || '—'}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {u.email} · {ROLE_LABEL[u.user_type] || u.user_type}
                      </p>
                    </div>
                    {u.user_type === 'franchisee' && (
                      <button onClick={() => openPlanModal(u)}
                        className="text-[10px] font-bold uppercase tracking-[0.15em] px-3.5 py-1.5 border border-white/12 text-white/30 hover:border-white/35 hover:text-white transition-colors flex-shrink-0">
                        План
                      </button>
                    )}
                    <button onClick={() => toggleUser(u)}
                      className={`text-[10px] font-bold uppercase tracking-[0.15em] px-3.5 py-1.5 border transition-colors flex-shrink-0 ${
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

      <BottomNav items={[
        { id: 'orders',   icon: Icons.list,   label: `Заказы${orders.length ? ` · ${orders.length}` : ''}`, active: tab === 'orders',   onClick: () => setTab('orders') },
        { id: 'products', icon: Icons.grid,   label: 'Товары',         active: tab === 'products', onClick: () => setTab('products') },
        { id: 'users',    icon: Icons.person, label: 'Польз.',         active: tab === 'users',    onClick: () => setTab('users') },
      ]} />

      {planModal && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPlanModal(null)}>
          <div className="bg-[#080808] border border-white/10 w-full max-w-sm p-7 space-y-5"
            onClick={e => e.stopPropagation()}>
            <div>
              <p className="text-[9px] font-semibold tracking-[0.4em] uppercase text-white/25 mb-1">План продаж</p>
              <p className="text-base font-black uppercase tracking-tight">{planModal.full_name}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Месяц</p>
              <input type="month" value={planMonth} onChange={e => setPlanMonth(e.target.value)}
                className="w-full bg-transparent border-b border-white/12 text-white/80 pb-2.5 text-sm outline-none focus:border-white/40 transition-colors" />
            </div>
            <div>
              <p className="text-[9px] font-semibold tracking-[0.35em] uppercase text-white/30 mb-2">Целевая выручка, ₸</p>
              <input value={planValue} onChange={e => setPlanValue(e.target.value.replace(/\D/g, ''))}
                placeholder="2000000" inputMode="numeric"
                className="w-full bg-transparent border-b border-white/12 text-white pb-2.5 text-xl font-black outline-none focus:border-white/40 transition-colors placeholder-white/15" />
            </div>
            {planErr && <p className="text-xs text-red-400/80">{planErr}</p>}
            <div className="flex gap-2.5">
              <button onClick={() => setPlanModal(null)}
                className="px-5 py-4 border border-white/10 text-white/30 text-xs hover:text-white/60 transition-colors">←</button>
              <button onClick={savePlan} disabled={planBusy}
                className="flex-1 bg-white text-black text-xs font-black uppercase tracking-[0.2em] py-4 hover:bg-white/92 transition-colors disabled:opacity-40">
                {planBusy ? '...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
