import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MobileUser {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  emailVerificado: boolean;
  celular?: string;
  ci?: string;
  foto?: string;
}

interface AuthState {
  user: MobileUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: MobileUser, token: string, refreshToken: string) => void;
  setTokens: (token: string, refreshToken?: string) => void;
  setUser: (user: MobileUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, token, refreshToken) =>
        set({ user, token, refreshToken, isAuthenticated: true }),
      setTokens: (token, refreshToken) =>
        set((state) => ({ token, refreshToken: refreshToken || state.refreshToken })),
      setUser: (user) => set({ user }),
      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: '@aura_auth_store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
