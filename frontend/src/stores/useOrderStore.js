import { create } from 'zustand';
import { api, getWsUrl } from '../api';

const useOrderStore = create((set, get) => ({
  orders: [],
  loading: false,
  wsConnected: false,
  _ws: null,

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
    set(s => ({ orders: [data.order, ...s.orders] }));
    return data.order;
  },

  updateStatus: async (orderId, status) => {
    const data = await api.orders.updateStatus(orderId, status);
    set(s => ({
      orders: s.orders.map(o => o.id === orderId ? data.order : o),
    }));
    return data.order;
  },

  // Called by WebSocket events
  _applyOrderEvent: (type, order) => {
    if (type === 'order_new') {
      set(s => ({
        orders: s.orders.find(o => o.id === order.id)
          ? s.orders
          : [order, ...s.orders],
      }));
    } else if (type === 'order_updated') {
      set(s => ({
        orders: s.orders.map(o => o.id === order.id ? order : o),
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
      // Reconnect after 3s
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
