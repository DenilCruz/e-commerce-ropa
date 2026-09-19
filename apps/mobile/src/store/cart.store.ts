import { create } from 'zustand';

interface CartState {
  items: any[];
}

export const useCartStore = create<CartState>(() => ({
  items: [],
}));
