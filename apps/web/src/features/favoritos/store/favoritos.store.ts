import { create } from 'zustand';
import { Favorito } from '../types';
import { favoritosApi } from '../services/favoritos.api';

interface FavoritosState {
  items: Favorito[];
  cargando: boolean;
  cargarFavoritos: (usuarioId: string) => Promise<void>;
  toggleFavorito: (usuarioId: string, productoId: string) => Promise<void>;
  esFavorito: (productoId: string) => boolean;
}

export const useFavoritosStore = create<FavoritosState>((set, get) => ({
  items: [],
  cargando: false,

  cargarFavoritos: async (usuarioId: string) => {
    set({ cargando: true });
    try {
      const items = await favoritosApi.obtenerPorUsuario(usuarioId);
      set({ items });
    } catch (error) {
      console.error('Error cargando favoritos:', error);
    } finally {
      set({ cargando: false });
    }
  },

  toggleFavorito: async (usuarioId: string, productoId: string) => {
    const { items, esFavorito } = get();
    const yaEsFavorito = esFavorito(productoId);
    
    // Optimizacion UI Optimista
    if (yaEsFavorito) {
      set({ items: items.filter(i => i.productoId !== productoId) });
      try {
        await favoritosApi.eliminar(usuarioId, productoId);
      } catch {
        // Revert on error
        get().cargarFavoritos(usuarioId);
      }
    } else {
      // Fake optimista
      const fakeFav = { id: 'temp', productoId, usuarioId, creadoEn: new Date().toISOString() };
      set({ items: [...items, fakeFav] });
      try {
        await favoritosApi.agregar({ usuarioId, productoId });
        get().cargarFavoritos(usuarioId); // Refresh real ID
      } catch {
        get().cargarFavoritos(usuarioId);
      }
    }
  },

  esFavorito: (productoId: string) => {
    return get().items.some(item => item.productoId === productoId);
  }
}));
