import { create } from 'zustand';
import { Favorito, favoritosApi } from '../services/favoritos.api';
import { useCartStore } from './cart.store';

interface FavoritosState {
  items: Favorito[];
  favoritosIds: string[];
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
  favoritosIds: [],
  cargando: false,

  cargarFavoritos: async (usuarioId: string) => {
    set({ cargando: true });
    try {
      const items = await favoritosApi.obtenerPorUsuario(usuarioId);
      set({ items, favoritosIds: items.map((i) => i.productoId) });
    } catch (error) {
      console.error('Error cargando favoritos en móvil:', error);
    } finally {
      set({ cargando: false });
    }
  },

  toggleFavorito: async (usuarioId: string, productoId: string) => {
    const { items, esFavorito } = get();
    const yaEsFav = esFavorito(productoId);

    if (yaEsFav) {
      const nuevosItems = items.filter((i) => i.productoId !== productoId);
      set({
        items: nuevosItems,
        favoritosIds: nuevosItems.map((i) => i.productoId),
      });
      try {
        await favoritosApi.eliminar(usuarioId, productoId);
      } catch (err) {
        console.error('Error al eliminar favorito:', err);
        get().cargarFavoritos(usuarioId);
      }
    } else {
      const fakeFav: Favorito = {
        id: 'temp-' + Date.now(),
        productoId,
        usuarioId,
        creadoEn: new Date().toISOString(),
      };
      const nuevosItems = [fakeFav, ...items];
      set({
        items: nuevosItems,
        favoritosIds: nuevosItems.map((i) => i.productoId),
      });
      try {
        await favoritosApi.agregar(usuarioId, productoId);
        get().cargarFavoritos(usuarioId);
      } catch (err) {
        console.error('Error al agregar favorito:', err);
        get().cargarFavoritos(usuarioId);
      }
    }
  },

  eliminarFavorito: async (usuarioId: string, productoId: string) => {
    const { items } = get();
    const nuevosItems = items.filter((i) => i.productoId !== productoId);
    set({
      items: nuevosItems,
      favoritosIds: nuevosItems.map((i) => i.productoId),
    });
    try {
      await favoritosApi.eliminar(usuarioId, productoId);
    } catch (err) {
      console.error('Error al eliminar favorito:', err);
      get().cargarFavoritos(usuarioId);
    }
  },

  limpiarTodos: async (usuarioId: string) => {
    set({ items: [], favoritosIds: [] });
    try {
      await favoritosApi.limpiarTodos(usuarioId);
    } catch (err) {
      console.error('Error al vaciar favoritos:', err);
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
      });

      // Remover de favoritos
      const nuevosItems = get().items.filter((i) => i.productoId !== productoId);
      set({
        items: nuevosItems,
        favoritosIds: nuevosItems.map((i) => i.productoId),
      });

      // Agregar al carrito local en móvil
      if (res.varianteId) {
        useCartStore.getState().addItem(res.varianteId, cantidad);
      }

      return { exito: true, mensaje: res.mensaje || 'Producto movido al carrito.' };
    } catch (err: any) {
      const mensaje =
        err.response?.data?.message || 'Error al intentar mover el producto al carrito.';
      return { exito: false, mensaje };
    }
  },

  esFavorito: (productoId: string) => {
    return get().favoritosIds.includes(productoId);
  },
}));
