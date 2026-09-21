import { api } from '../../../services/api';
import { 
  Resena, 
  ResumenResenas, 
  CrearResenaPayload, 
  ActualizarResenaPayload, 
  EstadoCompraResena 
} from '../types';

export const resenasApi = {
  obtenerPorProducto: async (productoId: string): Promise<Resena[]> => {
    const response = await api.get(`/resenas/producto/${productoId}`);
    return response.data;
  },

  obtenerResumen: async (productoId: string): Promise<ResumenResenas> => {
    const response = await api.get(`/resenas/producto/${productoId}/resumen`);
    return response.data;
  },

  verificarCompra: async (productoId: string, usuarioId: string): Promise<EstadoCompraResena> => {
    const response = await api.get(`/resenas/verificar-compra/${productoId}/${usuarioId}`);
    return response.data;
  },

  simularCompra: async (productoId: string, usuarioId: string): Promise<{ exito: boolean; mensaje: string }> => {
    const response = await api.post('/resenas/simular-compra', { productoId, usuarioId });
    return response.data;
  },

  crear: async (payload: CrearResenaPayload): Promise<Resena> => {
    const response = await api.post('/resenas', payload);
    return response.data;
  },

  actualizar: async (id: string, payload: ActualizarResenaPayload): Promise<Resena> => {
    const response = await api.put(`/resenas/${id}`, payload);
    return response.data;
  },

  eliminar: async (id: string, usuarioId: string): Promise<void> => {
    await api.delete(`/resenas/${id}?usuarioId=${encodeURIComponent(usuarioId)}`);
  },
};
