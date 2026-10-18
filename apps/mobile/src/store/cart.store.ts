import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartApi, Cart, CartItem } from '../services/cart.api';
import { cuponesApi, CuponAplicado } from '../services/cupones.api';
import { useAuthStore } from './auth.store';
import { useNetworkStore } from './network.store';

export interface GuestCartItem {
  varianteId: string;
  productoId?: string;
  tallaId?: string;
  colorId?: string;
  cantidad: number;
  nombre?: string;
  precioUnitario?: number;
  imagen?: string;
  talla?: string;
  color?: string;
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
  addItem: (
    varianteId: string,
    cantidad?: number,
    itemMeta?: {
      nombre?: string;
      precioUnitario?: number;
      imagen?: string;
      talla?: string;
      color?: string;
      productoId?: string;
    }
  ) => Promise<void>;
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
        const isConnected = useNetworkStore.getState().isConnected;

        // Si no hay conexión, mantener el carrito que ya tenemos guardado en persistencia
        if (!isConnected) {
          const currentCart = get().cart;
          set({ cargando: false });
          return;
        }

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
            // Modo Invitado
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

            try {
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
            } catch (errCalc) {
              // Si falla cálculo remoto, construir carrito estimado en local
              const existingCart = get().cart;
              if (existingCart) {
                set({ cargando: false });
              } else {
                let estimatedTotal = 0;
                let estimatedCount = 0;
                const localItems: CartItem[] = guestItems.map((gi) => {
                  const price = gi.precioUnitario || 0;
                  const itemSubtotal = price * gi.cantidad;
                  estimatedTotal += itemSubtotal;
                  estimatedCount += gi.cantidad;
                  return {
                    id: gi.varianteId,
                    varianteId: gi.varianteId,
                    productoId: gi.productoId || gi.varianteId,
                    tallaId: gi.tallaId,
                    colorId: gi.colorId,
                    cantidad: gi.cantidad,
                    precioUnitario: price,
                    subtotal: itemSubtotal,
                    stockDisponible: 99,
                    stockSuficiente: true,
                    producto: {
                      id: gi.productoId || gi.varianteId,
                      nombre: gi.nombre || 'Prenda en Carrito',
                      precioBase: price,
                      imagen: gi.imagen || null,
                    },
                    talla: gi.talla ? { id: gi.tallaId || 't-1', nombre: gi.talla } : null,
                    color: gi.color ? { id: gi.colorId || 'c-1', nombre: gi.color } : null,
                  };
                });

                set({
                  cart: {
                    items: localItems,
                    totalItems: estimatedCount,
                    total: Number(estimatedTotal.toFixed(2)),
                  },
                  totalConDescuento: Number(estimatedTotal.toFixed(2)),
                  cargando: false,
                });
              }
            }
          }
        } catch (err: any) {
          console.warn('[Cart] Error de red al cargar carrito. Se conserva la versión en caché local.');
          set({
            cargando: false,
          });
        }
      },

      addItem: async (varianteId: string, cantidad: number = 1, itemMeta) => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const isConnected = useNetworkStore.getState().isConnected;

        try {
          if (isAuthenticated && isConnected) {
            await cartApi.agregarItem({ varianteId, cantidad });
            await get().cargarCarrito();
          } else {
            // Manejo local (invitado o si no hay red)
            const guestItems = [...get().guestItems];
            const index = guestItems.findIndex((i) => i.varianteId === varianteId);

            if (index >= 0) {
              guestItems[index].cantidad += cantidad;
            } else {
              guestItems.push({
                varianteId,
                cantidad,
                nombre: itemMeta?.nombre,
                precioUnitario: itemMeta?.precioUnitario,
                imagen: itemMeta?.imagen,
                talla: itemMeta?.talla,
                color: itemMeta?.color,
                productoId: itemMeta?.productoId,
              });
            }

            set({ guestItems });

            if (isConnected) {
              await get().cargarCarrito();
            } else {
              // Recalcular localmente de forma inmediata
              let total = 0;
              let totalCount = 0;
              const localItems: CartItem[] = guestItems.map((gi) => {
                const price = gi.precioUnitario || 0;
                const sub = price * gi.cantidad;
                total += sub;
                totalCount += gi.cantidad;
                return {
                  id: gi.varianteId,
                  varianteId: gi.varianteId,
                  productoId: gi.productoId || gi.varianteId,
                  tallaId: gi.tallaId,
                  colorId: gi.colorId,
                  cantidad: gi.cantidad,
                  precioUnitario: price,
                  subtotal: sub,
                  stockDisponible: 99,
                  stockSuficiente: true,
                  producto: {
                    id: gi.productoId || gi.varianteId,
                    nombre: gi.nombre || 'Prenda en Carrito',
                    precioBase: price,
                    imagen: gi.imagen || null,
                  },
                  talla: gi.talla ? { id: gi.tallaId || 't-1', nombre: gi.talla } : null,
                  color: gi.color ? { id: gi.colorId || 'c-1', nombre: gi.color } : null,
                };
              });

              set({
                cart: {
                  items: localItems,
                  totalItems: totalCount,
                  total: Number(total.toFixed(2)),
                },
                totalConDescuento: Number(total.toFixed(2)),
                cargando: false,
              });
            }
          }
        } catch (err: any) {
          const msg = err?.response?.data?.message || 'No se pudo agregar el producto.';
          set({ error: msg, cargando: false });
          throw new Error(msg);
        }
      },

      updateQuantity: async (itemIdOrVarianteId: string, cantidad: number) => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const isConnected = useNetworkStore.getState().isConnected;

        try {
          if (isAuthenticated && isConnected) {
            await cartApi.actualizarCantidadItem(itemIdOrVarianteId, cantidad);
            await get().cargarCarrito();
          } else {
            let guestItems = [...get().guestItems];
            if (cantidad <= 0) {
              guestItems = guestItems.filter((i) => i.varianteId !== itemIdOrVarianteId);
            } else {
              const item = guestItems.find((i) => i.varianteId === itemIdOrVarianteId);
              if (item) item.cantidad = cantidad;
            }
            set({ guestItems });

            if (isConnected) {
              await get().cargarCarrito();
            } else {
              // Actualizar items en cart local
              const currentCart = get().cart;
              if (currentCart) {
                const updatedItems = currentCart.items
                  .map((it) => {
                    if (it.varianteId === itemIdOrVarianteId || it.id === itemIdOrVarianteId) {
                      const newCant = Math.max(0, cantidad);
                      return {
                        ...it,
                        cantidad: newCant,
                        subtotal: Number((it.precioUnitario * newCant).toFixed(2)),
                      };
                    }
                    return it;
                  })
                  .filter((it) => it.cantidad > 0);

                const newTotal = updatedItems.reduce((acc, it) => acc + it.subtotal, 0);
                const newCount = updatedItems.reduce((acc, it) => acc + it.cantidad, 0);

                set({
                  cart: {
                    items: updatedItems,
                    totalItems: newCount,
                    total: Number(newTotal.toFixed(2)),
                  },
                  totalConDescuento: Number(newTotal.toFixed(2)),
                  cargando: false,
                });
              } else {
                set({ cargando: false });
              }
            }
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
        const isConnected = useNetworkStore.getState().isConnected;

        try {
          if (isAuthenticated && isConnected) {
            await cartApi.eliminarItem(itemIdOrVarianteId);
            await get().cargarCarrito();
          } else {
            const guestItems = get().guestItems.filter(
              (i) => i.varianteId !== itemIdOrVarianteId
            );
            set({ guestItems });

            const currentCart = get().cart;
            if (currentCart) {
              const updatedItems = currentCart.items.filter(
                (it) => it.id !== itemIdOrVarianteId && it.varianteId !== itemIdOrVarianteId
              );
              const newTotal = updatedItems.reduce((acc, it) => acc + it.subtotal, 0);
              const newCount = updatedItems.reduce((acc, it) => acc + it.cantidad, 0);

              set({
                cart: {
                  items: updatedItems,
                  totalItems: newCount,
                  total: Number(newTotal.toFixed(2)),
                },
                totalConDescuento: Number(newTotal.toFixed(2)),
                cargando: false,
              });
            } else {
              set({ cargando: false });
            }
          }
        } catch (err: any) {
          const msg = err?.response?.data?.message || 'Error al eliminar artículo.';
          set({ error: msg, cargando: false });
        }
      },

      clearCart: async () => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const isConnected = useNetworkStore.getState().isConnected;

        try {
          if (isAuthenticated && isConnected) {
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
          set({
            guestItems: [],
            cart: { items: [], totalItems: 0, total: 0 },
            cargando: false,
          });
        }
      },

      aplicarCupon: async (codigo: string) => {
        const isConnected = useNetworkStore.getState().isConnected;
        if (!isConnected) {
          return {
            success: false,
            mensaje: 'Se requiere conexión a internet para validar cupones de descuento.',
          };
        }

        set({ cargando: true, error: null });
        const cart = get().cart;
        const subtotal = cart ? cart.total : 0;

        if (subtotal <= 0) {
          set({ cargando: false });
          return { success: false, mensaje: 'El carrito está vacío.' };
        }

        try {
          const res = await cuponesApi.aplicarCupon(codigo, subtotal);
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
        const isConnected = useNetworkStore.getState().isConnected;
        if (!isConnected) return;

        const guestItems = get().guestItems;
        if (guestItems.length > 0) {
          try {
            await cartApi.sincronizarCarrito(guestItems);
            set({ guestItems: [] });
          } catch (err) {
            console.error('Error al sincronizar carrito en mobile:', err);
          }
        }
        await get().cargarCarrito();
      },
    }),
    {
      name: '@aura_cart_store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cart: state.cart,
        guestItems: state.guestItems,
        cupon: state.cupon,
        descuento: state.descuento,
        totalConDescuento: state.totalConDescuento,
      }),
    }
  )
);
