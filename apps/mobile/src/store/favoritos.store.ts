import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export const useFavoritosStore = create<FavoritosState>()(
  persist(
    (set, get) => ({
      items: [],
      favoritosIds: [],
      cargando: false,

      cargarFavoritos: async (usuarioId: string) => {
        set({ cargando: true });
        try {
          const items = await favoritosApi.obtenerPorUsuario(usuarioId);
          set({ items, favoritosIds: items.map((i) => i.productoId) });
        } catch (error) {
          console.warn('[Favoritos] Error de red al cargar favoritos; usando favoritos locales.');
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
            console.warn('[Favoritos] Offline: eliminación guardada localmente.');
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
          } catch (err) {
            console.warn('[Favoritos] Offline: favorito guardado localmente.');
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
          console.warn('[Favoritos] Offline: eliminación guardada localmente.');
        }
      },

      limpiarTodos: async (usuarioId: string) => {
        set({ items: [], favoritosIds: [] });
        try {
          await favoritosApi.limpiarTodos(usuarioId);
        } catch (err) {
          console.warn('[Favoritos] Offline: vaciado guardado localmente.');
        }
      },

      moverAlCarrito: async (
        usuarioId: string,
        productoId: string,
        varianteId?: string,
        cantidad: number = 1,
      ) => {
        try {
          let varId = varianteId;
          if (!varId) {
            const fav = get().items.find((i) => i.productoId === productoId);
            const varianteConStock = fav?.producto?.variantes?.find((v) => v.stock > 0);
            if (!varianteConStock) {
              return { exito: false, mensaje: 'No hay stock disponible para esta prenda.' };
            }
            varId = varianteConStock.id;
          }

          await useCartStore.getState().addItem(varId, cantidad);
          await get().eliminarFavorito(usuarioId, productoId);
          return { exito: true, mensaje: 'Prenda movida al carrito con éxito.' };
        } catch (err: any) {
          return {
            exito: false,
            mensaje: err?.message || 'Error al mover al carrito.',
          };
        }
      },

      esFavorito: (productoId: string) => {
        return get().favoritosIds.includes(productoId);
      },
    }),
    {
      name: '@aura_favoritos_store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        favoritosIds: state.favoritosIds,
      }),
    }
  )
);
