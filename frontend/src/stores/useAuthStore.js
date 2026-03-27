import { create } from 'zustand';
import { api } from '../api';

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,

  init: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { set({ loading: false }); return; }
    try {
      const data = await api.me();
      set({ user: data.user, loading: false });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, loading: false });
    }
  },

  login: (tokens, userData) => {
    localStorage.setItem('access_token', tokens.access_token);
    if (tokens.refresh_token) localStorage.setItem('refresh_token', tokens.refresh_token);
    set({ user: userData });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null });
  },

  setUser: (userData) => set({ user: userData }),
}));

export default useAuthStore;
