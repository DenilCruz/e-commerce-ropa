import { api } from '../../../services/api';
import { Resena, ResumenResenas, CrearResenaPayload } from '../types';

export const resenasApi = {
  obtenerPorProducto: async (productoId: string): Promise<Resena[]> => {
    const response = await api.get(`/resenas/producto/${productoId}`);
    return response.data;
  },

  obtenerResumen: async (productoId: string): Promise<ResumenResenas> => {
    const response = await api.get(`/resenas/producto/${productoId}/resumen`);
    return response.data;
  },

  crear: async (payload: CrearResenaPayload): Promise<Resena> => {
    const response = await api.post('/resenas', payload);
    return response.data;
  }
};
