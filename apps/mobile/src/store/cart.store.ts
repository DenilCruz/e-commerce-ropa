import { create } from 'zustand';

interface CartState {
  items: any[];
  addItem: (variantId: string, quantity: number) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (variantId, quantity) =>
    set((state) => ({
      items: [...state.items, { variantId, quantity }],
    })),
}));
