import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartApi } from '../features/carrito/services/cart.api';
import { cuponesApi } from '../features/cupones/services/cupones.api';
import { Cart, CuponAplicado } from '../features/carrito/types';
import { useAuthStore } from './auth.store';

interface GuestCartItem {
  varianteId: string;
  productoId?: string;
  tallaId?: string;
  colorId?: string;
  cantidad: number;
}

interface CartStoreState {
  cart: Cart | null;
  guestItems: GuestCartItem[];
  cargando: boolean;
  error: string | null;
  cupon: CuponAplicado | null;
  descuento: number;
  totalConDescuento: number;
  mensajeCupon: string | null;

  // Actions
  cargarCarrito: () => Promise<void>;
  addItem: (varianteId: string, cantidad?: number) => Promise<void>;
  updateQuantity: (itemIdOrVarianteId: string, cantidad: number) => Promise<void>;
  removeItem: (itemIdOrVarianteId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  aplicarCupon: (codigo: string) => Promise<{ success: boolean; mensaje: string }>;
  removerCupon: () => void;
  sincronizarTrasLogin: () => Promise<void>;
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      cart: null,
      guestItems: [],
      cargando: false,
      error: null,
      cupon: null,
      descuento: 0,
      totalConDescuento: 0,
      mensajeCupon: null,

      cargarCarrito: async () => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;

        try {
          if (isAuthenticated) {
            const remoteCart = await cartApi.obtenerCarrito();
            const subtotal = remoteCart.total;
            const cupon = get().cupon;
            let descuento = 0;

            if (cupon) {
              if (cupon.tipo === 'PORCENTAJE') {
                descuento = Number(((subtotal * cupon.valor) / 100).toFixed(2));
              } else {
                descuento = Math.min(cupon.valor, subtotal);
              }
            }

            set({
              cart: remoteCart,
              descuento,
              totalConDescuento: Number(Math.max(0, subtotal - descuento).toFixed(2)),
              cargando: false,
            });
          } else {
            // Usuario invitado (Guest): Calcular temporal
            const guestItems = get().guestItems;
            if (guestItems.length === 0) {
              set({
                cart: { items: [], totalItems: 0, total: 0 },
                descuento: 0,
                totalConDescuento: 0,
                cargando: false,
              });
              return;
            }

            const calculatedCart = await cartApi.calcularCarritoTemporal(guestItems);
            const subtotal = calculatedCart.total;
            const cupon = get().cupon;
            let descuento = 0;

            if (cupon) {
              if (cupon.tipo === 'PORCENTAJE') {
                descuento = Number(((subtotal * cupon.valor) / 100).toFixed(2));
              } else {
                descuento = Math.min(cupon.valor, subtotal);
              }
            }

            set({
              cart: calculatedCart,
              descuento,
              totalConDescuento: Number(Math.max(0, subtotal - descuento).toFixed(2)),
              cargando: false,
            });
          }
        } catch (err: any) {
          console.error('Error al cargar carrito:', err);
          set({
            error: err?.response?.data?.message || 'Error al obtener el carrito.',
            cargando: false,
          });
        }
      },

      addItem: async (varianteId: string, cantidad: number = 1) => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;

        try {
          if (isAuthenticated) {
            await cartApi.agregarItem({ varianteId, cantidad });
            await get().cargarCarrito();
          } else {
            const guestItems = [...get().guestItems];
            const index = guestItems.findIndex((i) => i.varianteId === varianteId);

            if (index >= 0) {
              guestItems[index].cantidad += cantidad;
            } else {
              guestItems.push({ varianteId, cantidad });
            }

            set({ guestItems });
            await get().cargarCarrito();
          }
        } catch (err: any) {
          const msg = err?.response?.data?.message || 'No se pudo agregar el producto al carrito.';
          set({ error: msg, cargando: false });
          throw new Error(msg);
        }
      },

      updateQuantity: async (itemIdOrVarianteId: string, cantidad: number) => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;

        try {
          if (isAuthenticated) {
            // Si está autenticado, itemIdOrVarianteId es el id del item en detalle_carrito
            await cartApi.actualizarCantidadItem(itemIdOrVarianteId, cantidad);
            await get().cargarCarrito();
          } else {
            // Invitado: buscar por varianteId
            let guestItems = [...get().guestItems];
            if (cantidad <= 0) {
              guestItems = guestItems.filter((i) => i.varianteId !== itemIdOrVarianteId);
            } else {
              const item = guestItems.find((i) => i.varianteId === itemIdOrVarianteId);
              if (item) item.cantidad = cantidad;
            }
            set({ guestItems });
            await get().cargarCarrito();
          }
        } catch (err: any) {
          const msg = err?.response?.data?.message || 'No se pudo actualizar la cantidad.';
          set({ error: msg, cargando: false });
          throw new Error(msg);
        }
      },

      removeItem: async (itemIdOrVarianteId: string) => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;

        try {
          if (isAuthenticated) {
            await cartApi.eliminarItem(itemIdOrVarianteId);
            await get().cargarCarrito();
          } else {
            const guestItems = get().guestItems.filter((i) => i.varianteId !== itemIdOrVarianteId);
            set({ guestItems });
            await get().cargarCarrito();
          }
        } catch (err: any) {
          const msg = err?.response?.data?.message || 'Error al eliminar el artículo.';
          set({ error: msg, cargando: false });
        }
      },

      clearCart: async () => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;

        try {
          if (isAuthenticated) {
            await cartApi.vaciarCarrito();
          }
          set({
            guestItems: [],
            cart: { items: [], totalItems: 0, total: 0 },
            cupon: null,
            descuento: 0,
            totalConDescuento: 0,
            mensajeCupon: null,
            cargando: false,
          });
        } catch (err: any) {
          console.error('Error al vaciar carrito:', err);
          set({ cargando: false });
        }
      },

      aplicarCupon: async (codigo: string) => {
        set({ cargando: true, error: null });
        const cart = get().cart;
        const subtotal = cart ? cart.total : 0;

        if (subtotal <= 0) {
          set({ cargando: false });
          return { success: false, mensaje: 'El carrito está vacío. Agrega productos para aplicar un cupón.' };
        }

        try {
          const res = await cuponesApi.aplicarCupon({ codigo, subtotal });
          set({
            cupon: res.cupon,
            descuento: res.descuento,
            totalConDescuento: res.totalConDescuento,
            mensajeCupon: res.mensaje,
            cargando: false,
          });
          return { success: true, mensaje: res.mensaje };
        } catch (err: any) {
          const msg = err?.response?.data?.message || 'El cupón no es válido o ha expirado.';
          set({
            cupon: null,
            descuento: 0,
            totalConDescuento: subtotal,
            mensajeCupon: null,
            error: msg,
            cargando: false,
          });
          return { success: false, mensaje: msg };
        }
      },

      removerCupon: () => {
        const subtotal = get().cart?.total || 0;
        set({
          cupon: null,
          descuento: 0,
          totalConDescuento: subtotal,
          mensajeCupon: null,
        });
      },

      sincronizarTrasLogin: async () => {
        const guestItems = get().guestItems;
        if (guestItems.length > 0) {
          try {
            await cartApi.sincronizarCarrito(guestItems);
            set({ guestItems: [] });
          } catch (err) {
            console.error('Error al sincronizar carrito tras login:', err);
          }
        }
        await get().cargarCarrito();
      },
    }),
    {
      name: 'el-magnifico-cart-storage',
      partialize: (state) => ({
        guestItems: state.guestItems,
        cupon: state.cupon,
      }),
    },
  ),
);
