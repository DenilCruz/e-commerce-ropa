import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { leerSesion } from '../services/pos/sesion';

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

export interface TiendaActiva {
  id: string;
  nombre: string;
  slug: string;
}

interface AuthState {
  user: MobileUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  tiendaActiva: TiendaActiva | null;
  setAuth: (user: MobileUser, token: string, refreshToken: string, tienda?: TiendaActiva) => void;
  setTiendaActiva: (tienda: TiendaActiva) => void;
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
      tiendaActiva: null,
      setAuth: (user, token, refreshToken, tienda) =>
        set({ user, token, refreshToken, isAuthenticated: true, tiendaActiva: tienda ?? null }),
      setTiendaActiva: (tiendaActiva) => set({ tiendaActiva }),
      setTokens: (token, refreshToken) =>
        set((state) => ({ token, refreshToken: refreshToken || state.refreshToken })),
      setUser: (user) => set({ user }),
      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, tiendaActiva: null }),
    }),
    {
      name: '@aura_auth_store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function claveSesionActiva() {
  const sesion = leerSesion(useAuthStore.getState().token);
  return sesion ? `${sesion.usuarioId}:${sesion.tenantId}` : 'invitado';
}
