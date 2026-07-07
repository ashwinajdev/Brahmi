import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

interface AppState {
  user: User | null;
  token: string | null;
  theme: 'light' | 'dark';
  toasts: Toast[];
  confirmDialog: ConfirmOptions | null;
  isLoadingAuth: boolean;
  
  // Actions
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
  toggleTheme: () => void;
  initTheme: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  showConfirm: (options: ConfirmOptions) => void;
  hideConfirm: () => void;
  setLoadingAuth: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  user: null,
  token: localStorage.getItem('brahmi_auth_token'),
  theme: 'light',
  toasts: [],
  confirmDialog: null,
  isLoadingAuth: true,

  setAuth: (user: User | null, token: string | null) => {
    if (token) {
      localStorage.setItem('brahmi_auth_token', token);
    } else {
      localStorage.removeItem('brahmi_auth_token');
    }
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('brahmi_auth_token');
    set({ user: null, token: null });
    get().addToast('Logged out successfully', 'info');
  },

  toggleTheme: () => {
    // Light mode only, theme toggle disabled
  },

  initTheme: () => {
    localStorage.removeItem('brahmi_theme');
    document.documentElement.classList.remove('dark');
    set({ theme: 'light' });
  },

  addToast: (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // Auto-remove after 4 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  showConfirm: (options: ConfirmOptions) => {
    set({ confirmDialog: options });
  },

  hideConfirm: () => {
    set({ confirmDialog: null });
  },

  setLoadingAuth: (loading: boolean) => set({ isLoadingAuth: loading }),
}));

// Listen to unauthorized events from API client
if (typeof window !== 'undefined') {
  window.addEventListener('brahmi-unauthorized', () => {
    useAppStore.getState().setAuth(null, null);
    useAppStore.getState().addToast('Session expired. Please log in again.', 'error');
  });
}
