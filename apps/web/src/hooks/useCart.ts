import { useCartStore } from '../store/cart.store';

export const useCart = () => {
  return useCartStore();
};
