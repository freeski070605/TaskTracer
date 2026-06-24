import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../api/client';

interface User {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (tenantId: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  login: async (tenantId, email, password) => {
    set({ loading: true });
    const data = await apiFetch<{ accessToken: string; refreshToken: string; user: User }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ tenantId, email, password }) },
    );
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, loading: false });
  },
  logout: async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    set({ user: null });
  },
  getToken: async () => AsyncStorage.getItem('accessToken'),
}));
