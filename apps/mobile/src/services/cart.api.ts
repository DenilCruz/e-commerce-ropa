import { api } from './api';

export interface CartItemProduct {
  id: string;
  nombre: string;
  precioBase: number;
  imagen: string | null;
}

export interface CartItemTalla {
  id: string;
  nombre: string;
}

export interface CartItemColor {
  id: string;
  nombre: string;
}

export interface CartItem {
  id?: string;
  varianteId: string;
  productoId?: string;
  tallaId?: string;
  colorId?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  stockDisponible: number;
  stockSuficiente?: boolean;
  producto: CartItemProduct;
  talla: CartItemTalla | null;
  color: CartItemColor | null;
}

export interface Cart {
  id?: string;
  usuarioId?: string;
  items: CartItem[];
  totalItems: number;
  total: number;
  actualizadoEn?: string;
}

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
