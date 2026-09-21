import { api } from './api';
import { Producto } from './catalogo.api';

export interface Favorito {
  id: string;
  productoId: string;
  usuarioId: string;
  creadoEn: string;
  producto?: Producto;
}

export interface MoverFavoritoRespuesta {
  exito: boolean;
  mensaje: string;
  varianteId: string;
  carrito: any;
}

export const favoritosApi = {
  obtenerPorUsuario: async (usuarioId: string): Promise<Favorito[]> => {
    const response = await api.get(`/favoritos/usuario/${usuarioId}`);
    return response.data;
  },

  agregar: async (usuarioId: string, productoId: string): Promise<Favorito> => {
    const response = await api.post('/favoritos', { usuarioId, productoId });
    return response.data;
  },

  eliminar: async (usuarioId: string, productoId: string): Promise<void> => {
    await api.delete(`/favoritos/usuario/${usuarioId}/producto/${productoId}`);
  },

  limpiarTodos: async (usuarioId: string): Promise<{ eliminados: number; mensaje: string }> => {
    const response = await api.delete(`/favoritos/usuario/${usuarioId}`);
    return response.data;
  },

  moverAlCarrito: async (payload: {
    usuarioId: string;
    productoId: string;
    varianteId?: string;
    cantidad?: number;
  }): Promise<MoverFavoritoRespuesta> => {
    const response = await api.post('/favoritos/mover-al-carrito', payload);
    return response.data;
  },
};
