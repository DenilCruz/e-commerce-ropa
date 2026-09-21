import { create } from 'zustand';
import { Favorito } from '../types';
import { favoritosApi } from '../services/favoritos.api';
import { useCartStore } from '../../../store/cart.store';

interface FavoritosState {
  items: Favorito[];
  cargando: boolean;
  cargarFavoritos: (usuarioId: string) => Promise<void>;
  toggleFavorito: (usuarioId: string, productoId: string) => Promise<void>;
  eliminarFavorito: (usuarioId: string, productoId: string) => Promise<void>;
  limpiarTodos: (usuarioId: string) => Promise<void>;
  moverAlCarrito: (
    usuarioId: string,
    productoId: string,
    varianteId?: string,
    cantidad?: number,
  ) => Promise<{ exito: boolean; mensaje: string }>;
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

    // Optimistic UI Update
    if (yaEsFavorito) {
      set({ items: items.filter((i) => i.productoId !== productoId) });
      try {
        await favoritosApi.eliminar(usuarioId, productoId);
      } catch (err: any) {
        console.error('FAVORITOS ERROR al eliminar:', err.response?.data || err);
        get().cargarFavoritos(usuarioId);
      }
    } else {
      const fakeFav: Favorito = {
        id: 'temp-' + Date.now(),
        productoId,
        usuarioId,
        creadoEn: new Date().toISOString(),
      };
      set({ items: [fakeFav, ...items] });
      try {
        await favoritosApi.agregar({ usuarioId, productoId });
        get().cargarFavoritos(usuarioId); // Refrescar con datos del producto completo
      } catch (err: any) {
        console.error('FAVORITOS ERROR al agregar:', err.response?.data || err);
        get().cargarFavoritos(usuarioId);
      }
    }
  },

  eliminarFavorito: async (usuarioId: string, productoId: string) => {
    const { items } = get();
    // Optimistic UI Update
    set({ items: items.filter((i) => i.productoId !== productoId) });
    try {
      await favoritosApi.eliminar(usuarioId, productoId);
    } catch (err: any) {
      console.error('FAVORITOS ERROR al eliminar:', err.response?.data || err);
      get().cargarFavoritos(usuarioId);
    }
  },

  limpiarTodos: async (usuarioId: string) => {
    set({ items: [] });
    try {
      await favoritosApi.limpiarTodos(usuarioId);
    } catch (err: any) {
      console.error('FAVORITOS ERROR al vaciar lista:', err.response?.data || err);
      get().cargarFavoritos(usuarioId);
    }
  },

  moverAlCarrito: async (
    usuarioId: string,
    productoId: string,
    varianteId?: string,
    cantidad: number = 1,
  ) => {
    try {
      const res = await favoritosApi.moverAlCarrito({
        usuarioId,
        productoId,
        varianteId,
        cantidad,
        eliminarDeFavoritos: true,
      });

      // Actualizar favoritos localmente
      set((state) => ({
        items: state.items.filter((i) => i.productoId !== productoId),
      }));

      // Actualizar estado reactivo del carrito en frontend
      if (res.varianteId) {
        useCartStore.getState().addItem(res.varianteId, cantidad);
      }

      return { exito: true, mensaje: res.mensaje || 'Producto movido al carrito con éxito.' };
    } catch (err: any) {
      const mensaje =
        err.response?.data?.message || 'Error al intentar mover el producto al carrito.';
      return { exito: false, mensaje };
    }
  },

  esFavorito: (productoId: string) => {
    return get().items.some((item) => item.productoId === productoId);
  },
}));
