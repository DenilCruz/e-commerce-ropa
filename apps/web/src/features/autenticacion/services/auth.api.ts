import { api } from '../../../services/api';
import {
  AuthResponse,
  LoginRequest,
  RegistroRequest,
  RegistroResponse,
  RecuperarPasswordRequest,
  RestablecerPasswordRequest,
  VerificarEmailRequest,
  UserProfile,
} from '../types';

export const authApi = {
  registro: async (data: RegistroRequest): Promise<RegistroResponse> => {
    const res = await api.post('/auth/registro', data);
    return res.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  logout: async (refreshToken?: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/logout', { refreshToken });
    return res.data;
  },

  recuperarPassword: async (data: RecuperarPasswordRequest): Promise<{ message: string }> => {
    const res = await api.post('/auth/recuperar-password', data);
    return res.data;
  },

  restablecerPassword: async (data: RestablecerPasswordRequest): Promise<{ message: string }> => {
    const res = await api.post('/auth/restablecer-password', data);
    return res.data;
  },

  verificarEmail: async (data: VerificarEmailRequest): Promise<{ message: string; usuario: Partial<UserProfile> }> => {
    const res = await api.post('/auth/verificar-email', data);
    return res.data;
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const res = await api.post('/auth/refresh', { refreshToken });
    return res.data;
  },

  getPerfil: async (): Promise<{ message: string; usuario: any }> => {
    const res = await api.get('/auth/perfil');
    return res.data;
  },
};
