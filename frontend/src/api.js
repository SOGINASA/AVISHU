export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function getWsUrl() {
  return BASE_URL.replace(/^http/, 'ws');
}

function authHeaders() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req(path, { headers: extraHeaders = {}, ...options } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function authed(path, options = {}) {
  return req(path, { ...options, headers: { ...authHeaders(), ...options.headers } });
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (email, password) =>
    req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (fullName, email, password, role = 'client') =>
    req('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, email, password, role }),
    }),

  me: () => authed('/api/auth/me'),

  oauthStart: (provider) => req(`/api/auth/oauth/start/${provider}`),

  // ── Products ─────────────────────────────────────────────────────────────
  products: {
    list: (category) => req(`/api/products/${category ? `?category=${category}` : ''}`),
    get: (id) => req(`/api/products/${id}`),
    seed: () => authed('/api/products/seed', { method: 'POST' }),
  },

  // ── Orders ───────────────────────────────────────────────────────────────
  orders: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return authed(`/api/orders/${qs ? `?${qs}` : ''}`);
    },
    get: (id) => authed(`/api/orders/${id}`),
    create: (payload) =>
      authed('/api/orders/', { method: 'POST', body: JSON.stringify(payload) }),
    updateStatus: (id, status) =>
      authed(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    list: (page = 1) => authed(`/api/notifications/get?page=${page}`),
    unreadCount: () => authed('/api/notifications/unread-count'),
    markRead: (id) => authed(`/api/notifications/read/${id}`, { method: 'POST' }),
    markAllRead: () => authed('/api/notifications/read-all', { method: 'POST' }),
    delete: (id) => authed(`/api/notifications/${id}`, { method: 'DELETE' }),
    sendTest: () => authed('/api/notifications/test', { method: 'POST' }),
    vapidKey: () => req('/api/notifications/vapid-key'),
    subscribePush: (sub) =>
      authed('/api/notifications/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
    unsubscribePush: (data) =>
      authed('/api/notifications/unsubscribe', { method: 'DELETE', body: JSON.stringify(data) }),
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    stats: () => authed('/api/admin/stats'),
    users: (page = 1, search = '') =>
      authed(`/api/admin/users?page=${page}&per_page=15&search=${encodeURIComponent(search)}`),
    activate: (id) => authed(`/api/admin/users/${id}/activate`, { method: 'POST' }),
    deactivate: (id) => authed(`/api/admin/users/${id}/deactivate`, { method: 'POST' }),
    feedback: (page = 1) => authed(`/api/admin/feedback?page=${page}`),
    auditLogs: (page = 1) => authed(`/api/admin/audit-logs?page=${page}&per_page=25`),
  },
};
