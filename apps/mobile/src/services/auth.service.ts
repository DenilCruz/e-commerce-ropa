import { api } from './api';
import { MobileUser } from '../store/auth.store';

export interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  usuario: MobileUser;
}

export const authService = {
  registro: async (data: {
    nombre: string;
    apellido: string;
    correo: string;
    contrasena: string;
    celular?: string;
    ci?: string;
  }): Promise<{ message: string; usuario: MobileUser }> => {
    const res = await api.post('/auth/registro', data);
    return res.data;
  },

  login: async (data: { correo: string; contrasena: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  logout: async (refreshToken?: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/logout', { refreshToken });
    return res.data;
  },

  recuperarPassword: async (correo: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/recuperar-password', { correo });
    return res.data;
  },

  restablecerPassword: async (token: string, nuevaContrasena: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/restablecer-password', { token, nuevaContrasena });
    return res.data;
  },

  verificarEmail: async (token: string): Promise<{ message: string; usuario: Partial<MobileUser> }> => {
    const res = await api.post('/auth/verificar-email', { token });
    return res.data;
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const res = await api.post('/auth/refresh', { refreshToken });
    return res.data;
  },
};
