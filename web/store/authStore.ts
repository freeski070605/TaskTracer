'use client';
import { create } from 'zustand';
import { clearTokens, loadUser, saveTokens, saveUser } from '../lib/auth';
import { apiFetch } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantKey: string;
  organizationName: string;
  organizationSlug: string;
  isActive?: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  hydrate: () => void;
  setUser: (user: User | null) => void;
  login: (organization: string, email: string, password: string) => Promise<void>;
  register: (organizationName: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  hydrated: false,
  hydrate: () => {
    if (typeof window === 'undefined') return;
    const user = loadUser<User>();
    set({ user, hydrated: true });
  },
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        saveUser(user);
      } else {
        localStorage.removeItem('tasktracer.user');
      }
    }

    set({ user, hydrated: true });
  },
  login: async (organization, email, password) => {
    set({ loading: true, error: null });
    try {
      const body: Record<string, string> = { email, password };
      if (organization.trim()) {
        body.organization = organization.trim();
      }

      const data = await apiFetch<{ accessToken: string; refreshToken: string; user: User }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(body) },
      );
      saveTokens(data.accessToken, data.refreshToken);
      saveUser(data.user);
      set({ user: data.user, loading: false, error: null, hydrated: true });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Sign in failed', hydrated: true });
      throw error;
    }
  },
  register: async (organizationName, name, email, password) => {
    set({ loading: true, error: null });
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ organizationName, name, email, password, role: 'admin' }),
      });
      set({ loading: false, error: null, hydrated: true });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Registration failed', hydrated: true });
      throw error;
    }
  },
  logout: () => {
    clearTokens();
    set({ user: null, error: null, hydrated: true });
  },
}));
