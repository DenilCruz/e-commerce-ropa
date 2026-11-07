import { api } from './api';
import { AuthResponse } from './auth.service';

export interface MiTienda {
  id: string;
  nombre: string;
  slug: string;
  plan: string;
  rol: string;
  esActiva: boolean;
}

export const tiendasApi = {
  obtenerPublica: async (slug: string): Promise<{ tiendaId: string; nombre: string; slug: string }> => {
    const res = await api.get('/auth/tiendas/config-pago-publica', {
      headers: { 'X-Tenant-Slug': slug, Authorization: false },
    });
    return res.data;
  },

  listarMias: async (): Promise<MiTienda[]> => {
    const res = await api.get<MiTienda[]>('/auth/tiendas');
    return res.data;
  },

  /** Emite una sesión nueva (tokens y rol) limitada a la tienda elegida. */
  seleccionar: async (tiendaId: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>(`/auth/tiendas/${tiendaId}/seleccionar`);
    return res.data;
  },
};
