import { create } from 'zustand';

interface FavoritosState {
  favoritosIds: string[];
  toggleFavorito: (productoId: string) => void;
  esFavorito: (productoId: string) => boolean;
}

export const useFavoritosStore = create<FavoritosState>((set, get) => ({
  favoritosIds: [],
  toggleFavorito: (productoId) => {
    set((state) => {
      const isFav = state.favoritosIds.includes(productoId);
      if (isFav) {
        return { favoritosIds: state.favoritosIds.filter((id) => id !== productoId) };
      }
      return { favoritosIds: [...state.favoritosIds, productoId] };
    });
  },
  esFavorito: (productoId) => get().favoritosIds.includes(productoId),
}));
