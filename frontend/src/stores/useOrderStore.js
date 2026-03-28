import { create } from 'zustand';
import { api, getWsUrl } from '../api';

const useOrderStore = create((set, get) => ({
  orders: [],
  loading: false,
  wsConnected: false,
  _ws: null,

  cart: [],

  addToCart: (product, qty = 1, desiredDate = null) => {
    set(s => {
      const existing = s.cart.find(i => i.product.id === product.id);
      if (existing) {
        return { cart: s.cart.map(i => i.product.id === product.id ? { ...i, qty: i.qty + qty } : i) };
      }
      return { cart: [...s.cart, { product, qty, desiredDate }] };
    });
  },

  removeFromCart: (productId) => {
    set(s => ({ cart: s.cart.filter(i => i.product.id !== productId) }));
  },

  setCartQty: (productId, qty) => {
    if (qty < 1) { get().removeFromCart(productId); return; }
    set(s => ({ cart: s.cart.map(i => i.product.id === productId ? { ...i, qty } : i) }));
  },

  clearCart: () => set({ cart: [] }),

  checkoutCart: async () => {
    const items = get().cart;
    const results = await Promise.allSettled(
      items.map(item =>
        api.orders.create({
          productId: item.product.id,
          quantity: item.qty,
          desiredDate: item.desiredDate || undefined,
        })
      )
    );
    const succeeded = [];
    const failed = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        succeeded.push(r.value.order);
      } else {
        failed.push({ product: items[i].product, reason: r.reason?.message || 'Ошибка' });
      }
    });
    if (succeeded.length > 0) {
      set(s => {
        const fresh = succeeded.filter(o => !s.orders.find(x => x.id === o.id));
        return { orders: [...fresh.reverse(), ...s.orders] };
      });
      get().clearCart();
    }
    return { succeeded, failed };
  },

  fetchOrders: async (params = {}) => {
    set({ loading: true });
    try {
      const data = await api.orders.list(params);
      set({ orders: data.orders || [] });
    } catch (e) {
      console.error('fetchOrders error', e);
    } finally {
      set({ loading: false });
    }
  },

  createOrder: async (payload) => {
    const data = await api.orders.create(payload);
    set(s => ({
      orders: s.orders.find(o => o.id === data.order.id)
        ? s.orders.map(o => o.id === data.order.id ? data.order : o)
        : [data.order, ...s.orders],
    }));
    return data.order;
  },

  updateStatus: async (orderId, status) => {
    const data = await api.orders.updateStatus(orderId, status);
    set(s => ({
      orders: s.orders.map(o => o.id === orderId ? data.order : o),
    }));
    return data.order;
  },

  _applyOrderEvent: (type, order) => {
    if (type === 'order_new') {
      set(s => ({
        orders: s.orders.find(o => o.id === order.id)
          ? s.orders
          : [order, ...s.orders],
      }));
    } else if (type === 'order_updated') {
      set(s => ({
        orders: s.orders.find(o => o.id === order.id)
          ? s.orders.map(o => o.id === order.id ? order : o)
          : [order, ...s.orders],
      }));
    }
  },

  connectWs: () => {
    if (get()._ws) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const ws = new WebSocket(`${getWsUrl()}/ws/notifications?token=${token}`);

    ws.onopen = () => set({ wsConnected: true });
    ws.onclose = () => {
      set({ wsConnected: false, _ws: null });
      setTimeout(() => {
        if (localStorage.getItem('access_token')) get().connectWs();
      }, 3000);
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'order_new' || msg.type === 'order_updated') {
          get()._applyOrderEvent(msg.type, msg.payload);
        }
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      } catch {}
    };

    set({ _ws: ws });
  },

  disconnectWs: () => {
    const ws = get()._ws;
    if (ws) { ws.close(); set({ _ws: null, wsConnected: false }); }
  },
}));

export default useOrderStore;
