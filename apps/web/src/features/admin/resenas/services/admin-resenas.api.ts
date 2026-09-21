import { api } from '../../../../services/api';
import { ResenaAdmin, ResenasKpisAdmin } from '../types';

export const adminResenasApi = {
  obtenerKpis: async (): Promise<ResenasKpisAdmin> => {
    const response = await api.get('/resenas/admin/kpis');
    return response.data;
  },

  obtenerTodas: async (busqueda?: string, estado?: 'todas' | 'aprobadas' | 'ocultas'): Promise<ResenaAdmin[]> => {
    const params: Record<string, string> = {};
    if (busqueda && busqueda.trim() !== '') params.busqueda = busqueda.trim();
    if (estado && estado !== 'todas') params.estado = estado;

    const response = await api.get('/resenas/admin/todas', { params });
    return response.data;
  },

  toggleModerar: async (id: string): Promise<ResenaAdmin> => {
    const response = await api.put(`/resenas/admin/${id}/moderar`);
    return response.data;
  },

  eliminar: async (id: string): Promise<void> => {
    await api.delete(`/resenas/admin/${id}`);
  },
};
