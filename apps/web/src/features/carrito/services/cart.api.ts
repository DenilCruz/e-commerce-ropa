import { api } from '../../../services/api';
import { Cart } from '../types';

export const cartApi = {
  // Obtener carrito del usuario autenticado
  obtenerCarrito: async (): Promise<Cart> => {
    const res = await api.get<Cart>('/cart');
    return res.data;
  },

  // Agregar un item al carrito (autenticado)
  agregarItem: async (dto: {
    varianteId?: string;
    productoId?: string;
    tallaId?: string;
    colorId?: string;
    cantidad?: number;
  }): Promise<Cart> => {
    const res = await api.post<Cart>('/cart/items', dto);
    return res.data;
  },

  // Modificar cantidad de un item (autenticado)
  actualizarCantidadItem: async (itemId: string, cantidad: number): Promise<Cart> => {
    const res = await api.put<Cart>(`/cart/items/${itemId}`, { cantidad });
    return res.data;
  },

  // Eliminar un item del carrito (autenticado)
  eliminarItem: async (itemId: string): Promise<Cart> => {
    const res = await api.delete<Cart>(`/cart/items/${itemId}`);
    return res.data;
  },

  // Vaciar todo el carrito (autenticado)
  vaciarCarrito: async (): Promise<Cart> => {
    const res = await api.delete<Cart>('/cart/vaciar');
    return res.data;
  },

  // Sincronizar items de visitante tras iniciar sesión
  sincronizarCarrito: async (items: Array<{
    varianteId?: string;
    productoId?: string;
    tallaId?: string;
    colorId?: string;
    cantidad: number;
  }>): Promise<Cart> => {
    const res = await api.post<Cart>('/cart/sincronizar', { items });
    return res.data;
  },

  // Calcular carrito temporal para visitantes (sin login)
  calcularCarritoTemporal: async (items: Array<{
    varianteId?: string;
    productoId?: string;
    tallaId?: string;
    colorId?: string;
    cantidad: number;
  }>): Promise<Cart> => {
    const res = await api.post<Cart>('/cart/calcular-temporal', { items });
    return res.data;
  },
};
