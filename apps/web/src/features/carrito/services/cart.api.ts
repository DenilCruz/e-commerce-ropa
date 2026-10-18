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

  // Sincronizar items de visitante tras iniciar sesión o reconexión
  sincronizarCarrito: async (items: Array<any>): Promise<Cart> => {
    const cleanItems = items.map((i) => ({
      varianteId: i.varianteId,
      productoId: i.productoId,
      tallaId: i.tallaId,
      colorId: i.colorId,
      cantidad: i.cantidad || 1,
    }));
    const res = await api.post<Cart>('/cart/sincronizar', { items: cleanItems });
    return res.data;
  },

  // Calcular carrito temporal para visitantes (sin login)
  calcularCarritoTemporal: async (items: Array<any>): Promise<Cart> => {
    const cleanItems = items.map((i) => ({
      varianteId: i.varianteId,
      productoId: i.productoId,
      tallaId: i.tallaId,
      colorId: i.colorId,
      cantidad: i.cantidad || 1,
    }));
    const res = await api.post<Cart>('/cart/calcular-temporal', { items: cleanItems });
    return res.data;
  },
};
