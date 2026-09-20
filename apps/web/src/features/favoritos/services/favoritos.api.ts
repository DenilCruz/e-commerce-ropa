import { api } from '../../../services/api';
import { Favorito, AgregarFavoritoPayload } from '../types';

export const favoritosApi = {
  obtenerPorUsuario: async (usuarioId: string): Promise<Favorito[]> => {
    const response = await api.get(`/favoritos/usuario/${usuarioId}`);
    return response.data;
  },

  agregar: async (payload: AgregarFavoritoPayload): Promise<Favorito> => {
    const response = await api.post('/favoritos', payload);
    return response.data;
  },

  eliminar: async (usuarioId: string, productoId: string): Promise<void> => {
    await api.delete(`/favoritos/usuario/${usuarioId}/producto/${productoId}`);
  }
};
