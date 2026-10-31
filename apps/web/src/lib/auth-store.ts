import { create } from 'zustand';
import { api } from './api';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  is_onboarded?: boolean;
  profile?: {
    id?: string;
    full_name?: string;
    mobile_number?: string | null;
    country?: string;
    preferred_currency?: string;
  } | null;
  accounts?: any[];
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  checkAuth: () => Promise<boolean>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isInitialized: false,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await api.getCurrentUser();
      if (res && res.authenticated && res.user) {
        set({
          user: res.user,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
        return true;
      }
    } catch {
      // not authenticated
    }
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    });
    return false;
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      isInitialized: true,
    });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // ignore logout errors
    }
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
}));

