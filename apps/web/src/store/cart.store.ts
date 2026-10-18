import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartApi } from '../features/carrito/services/cart.api';
import { cuponesApi } from '../features/cupones/services/cupones.api';
import { Cart, CartItem, CuponAplicado } from '../features/carrito/types';
import { useAuthStore } from './auth.store';
import { storageService, STORAGE_KEYS } from '../services/storage.service';
import { Producto } from '../features/catalogo/types';

export interface GuestCartItem {
  varianteId: string;
  productoId?: string;
  tallaId?: string;
  colorId?: string;
  cantidad: number;
  nombre?: string;
  precioUnitario?: number;
  imagen?: string | null;
  talla?: string | null;
  color?: string | null;
}

export interface ItemMetadata {
  nombre?: string;
  precioUnitario?: number;
  imagen?: string | null;
  talla?: string | null;
  color?: string | null;
  productoId?: string;
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
  isDrawerOpen: boolean;

  // Actions
  openDrawer: () => void;
  closeDrawer: () => void;
  cargarCarrito: () => Promise<void>;
  addItem: (varianteId: string, cantidad?: number, itemMeta?: ItemMetadata) => Promise<void>;
  updateQuantity: (itemIdOrVarianteId: string, cantidad: number) => Promise<void>;
  removeItem: (itemIdOrVarianteId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  aplicarCupon: (codigo: string) => Promise<{ success: boolean; mensaje: string }>;
  removerCupon: () => void;
  sincronizarTrasLogin: () => Promise<void>;
}

/**
 * Helper para recalcular el carrito en memoria local cuando el backend no está disponible
 */
const recalcularCarritoLocal = (
  guestItems: GuestCartItem[],
  cupon: CuponAplicado | null,
): { cart: Cart; descuento: number; totalConDescuento: number } => {
  let subtotal = 0;
  let totalItems = 0;

  const items: CartItem[] = guestItems.map((gi) => {
    const precio = gi.precioUnitario || 0;
    const itemSubtotal = Number((precio * gi.cantidad).toFixed(2));
    subtotal += itemSubtotal;
    totalItems += gi.cantidad;

    return {
      id: gi.varianteId,
      varianteId: gi.varianteId,
      productoId: gi.productoId || gi.varianteId,
      tallaId: gi.tallaId,
      colorId: gi.colorId,
      cantidad: gi.cantidad,
      precioUnitario: precio,
      subtotal: itemSubtotal,
      stockDisponible: 99,
      stockSuficiente: true,
      producto: {
        id: gi.productoId || gi.varianteId,
        nombre: gi.nombre || 'Prenda en Carrito',
        precioBase: precio,
        imagen: gi.imagen || null,
      },
      talla: gi.talla ? { id: gi.tallaId || 't-1', nombre: gi.talla } : null,
      color: gi.color ? { id: gi.colorId || 'c-1', nombre: gi.color } : null,
    };
  });

  subtotal = Number(subtotal.toFixed(2));
  let descuento = 0;
  if (cupon) {
    if (cupon.tipo === 'PORCENTAJE') {
      descuento = Number(((subtotal * cupon.valor) / 100).toFixed(2));
    } else {
      descuento = Math.min(cupon.valor, subtotal);
    }
  }

  const totalConDescuento = Number(Math.max(0, subtotal - descuento).toFixed(2));

  return {
    cart: {
      items,
      totalItems,
      total: subtotal,
    },
    descuento,
    totalConDescuento,
  };
};

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
      isDrawerOpen: false,

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),

      cargarCarrito: async () => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        const cupon = get().cupon;
        const guestItems = get().guestItems;

        try {
          if (isAuthenticated) {
            if (isOnline) {
              // Si hay items acumulados en guestItems (agregados durante offline), sincronizarlos primero al backend
              if (guestItems.length > 0) {
                try {
                  await cartApi.sincronizarCarrito(guestItems);
                  set({ guestItems: [] });
                } catch (syncErr) {
                  console.warn('[cart.store] Error sincronizando items offline al reconectar:', syncErr);
                }
              }

              // Traer el carrito remoto del backend
              const remoteCart = await cartApi.obtenerCarrito();
              const subtotal = remoteCart.total;
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
              // Sin conexión pero autenticado: si hay guestItems, recalcular en memoria; si no, conservar cart existente
              if (guestItems.length > 0) {
                const local = recalcularCarritoLocal(guestItems, cupon);
                set({
                  cart: local.cart,
                  descuento: local.descuento,
                  totalConDescuento: local.totalConDescuento,
                  cargando: false,
                });
              } else {
                set({ cargando: false });
              }
            }
          } else {
            // Usuario invitado (Guest)
            if (guestItems.length === 0) {
              set({
                cart: { items: [], totalItems: 0, total: 0 },
                descuento: 0,
                totalConDescuento: 0,
                cargando: false,
              });
              return;
            }

            if (isOnline) {
              try {
                const calculatedCart = await cartApi.calcularCarritoTemporal(guestItems);
                const subtotal = calculatedCart.total;
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
              } catch (remoteErr) {
                console.warn('[cart.store] Falló cálculo remoto en servidor, usando cálculo local:', remoteErr);
                const local = recalcularCarritoLocal(guestItems, cupon);
                set({
                  cart: local.cart,
                  descuento: local.descuento,
                  totalConDescuento: local.totalConDescuento,
                  cargando: false,
                });
              }
            } else {
              // Offline: calcular instantáneamente en memoria local
              const local = recalcularCarritoLocal(guestItems, cupon);
              set({
                cart: local.cart,
                descuento: local.descuento,
                totalConDescuento: local.totalConDescuento,
                cargando: false,
              });
            }
          }
        } catch (err: any) {
          console.warn('[cart.store] Error al sincronizar carrito remoto, preservando estado local:', err);
          if (guestItems.length > 0) {
            const local = recalcularCarritoLocal(guestItems, cupon);
            set({
              cart: local.cart,
              descuento: local.descuento,
              totalConDescuento: local.totalConDescuento,
              cargando: false,
            });
          } else {
            set({ cargando: false });
          }
        }
      },

      addItem: async (varianteId: string, cantidad: number = 1, itemMeta?: ItemMetadata) => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        // Intentar autocompletar metadatos desde el caché de productos si no vinieron explícitos
        let meta = { ...itemMeta };
        if (!meta.nombre || !meta.precioUnitario) {
          try {
            const cachedProds = storageService.getCache<Producto[]>(STORAGE_KEYS.PRODUCTOS) || [];
            for (const p of cachedProds) {
              const v = p.variantes?.find((varItem) => varItem.id === varianteId);
              if (v) {
                meta = {
                  nombre: p.nombre,
                  precioUnitario: Number(p.precio) + Number(v.precioExtra || 0),
                  imagen: p.imagenes?.[0]?.url || null,
                  talla: v.talla?.nombre || null,
                  color: v.color?.nombre || null,
                  productoId: p.id,
                  ...meta,
                };
                break;
              }
            }
          } catch (e) {
            // Silencioso
          }
        }

        // Si guestItems estaba vacío pero el cart ya tenía productos del servidor, absorberlos para no perderlos en offline
        let guestItems = [...get().guestItems];
        if (guestItems.length === 0 && get().cart?.items && get().cart.items.length > 0) {
          guestItems = get().cart.items.map((ci) => ({
            varianteId: ci.varianteId,
            productoId: ci.productoId,
            tallaId: ci.tallaId,
            colorId: ci.colorId,
            cantidad: ci.cantidad,
            nombre: ci.producto?.nombre,
            precioUnitario: ci.precioUnitario,
            imagen: ci.producto?.imagen,
            talla: ci.talla?.nombre,
            color: ci.color?.nombre,
          }));
        }

        // Añadir o actualizar en guestItems
        const index = guestItems.findIndex((i) => i.varianteId === varianteId);
        if (index >= 0) {
          guestItems[index].cantidad += cantidad;
          if (meta.nombre) guestItems[index].nombre = meta.nombre;
          if (meta.precioUnitario) guestItems[index].precioUnitario = meta.precioUnitario;
          if (meta.imagen) guestItems[index].imagen = meta.imagen;
          if (meta.talla) guestItems[index].talla = meta.talla;
          if (meta.color) guestItems[index].color = meta.color;
          if (meta.productoId) guestItems[index].productoId = meta.productoId;
        } else {
          guestItems.push({
            varianteId,
            cantidad,
            nombre: meta.nombre,
            precioUnitario: meta.precioUnitario,
            imagen: meta.imagen,
            talla: meta.talla,
            color: meta.color,
            productoId: meta.productoId,
          });
        }

        set({ guestItems });

        // Pintar inmediatamente en memoria local (0ms de latencia, visible en bolsa de inmediato)
        const local = recalcularCarritoLocal(guestItems, get().cupon);
        set({
          cart: local.cart,
          descuento: local.descuento,
          totalConDescuento: local.totalConDescuento,
        });

        // Si está online y autenticado, sincronizar con el servidor en segundo plano
        if (isAuthenticated && isOnline) {
          try {
            await cartApi.sincronizarCarrito(guestItems);
            set({ guestItems: [] });
            await get().cargarCarrito();
          } catch (err: any) {
            console.warn('[cart.store] Error al sincronizar con servidor remoto, conservando copia local:', err);
            set({ cargando: false });
          }
        } else if (!isAuthenticated && isOnline) {
          try {
            await get().cargarCarrito();
          } catch {
            set({ cargando: false });
          }
        } else {
          set({ cargando: false });
        }
      },

      updateQuantity: async (itemIdOrVarianteId: string, cantidad: number) => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        let guestItems = [...get().guestItems];
        if (guestItems.length === 0 && get().cart?.items && get().cart.items.length > 0) {
          guestItems = get().cart.items.map((ci) => ({
            varianteId: ci.varianteId,
            productoId: ci.productoId,
            tallaId: ci.tallaId,
            colorId: ci.colorId,
            cantidad: ci.cantidad,
            nombre: ci.producto?.nombre,
            precioUnitario: ci.precioUnitario,
            imagen: ci.producto?.imagen,
            talla: ci.talla?.nombre,
            color: ci.color?.nombre,
          }));
        }

        if (cantidad <= 0) {
          guestItems = guestItems.filter((i) => i.varianteId !== itemIdOrVarianteId);
        } else {
          const item = guestItems.find((i) => i.varianteId === itemIdOrVarianteId);
          if (item) item.cantidad = cantidad;
        }
        set({ guestItems });

        const local = recalcularCarritoLocal(guestItems, get().cupon);
        set({
          cart: local.cart,
          descuento: local.descuento,
          totalConDescuento: local.totalConDescuento,
        });

        if (isAuthenticated && isOnline) {
          try {
            await cartApi.actualizarCantidadItem(itemIdOrVarianteId, cantidad);
            set({ guestItems: [] });
            await get().cargarCarrito();
          } catch (err: any) {
            console.warn('[cart.store] Error actualizando cantidad remota:', err);
            set({ cargando: false });
          }
        } else {
          set({ cargando: false });
        }
      },

      removeItem: async (itemIdOrVarianteId: string) => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        let guestItems = [...get().guestItems];
        if (guestItems.length === 0 && get().cart?.items && get().cart.items.length > 0) {
          guestItems = get().cart.items.map((ci) => ({
            varianteId: ci.varianteId,
            productoId: ci.productoId,
            tallaId: ci.tallaId,
            colorId: ci.colorId,
            cantidad: ci.cantidad,
            nombre: ci.producto?.nombre,
            precioUnitario: ci.precioUnitario,
            imagen: ci.producto?.imagen,
            talla: ci.talla?.nombre,
            color: ci.color?.nombre,
          }));
        }

        guestItems = guestItems.filter((i) => i.varianteId !== itemIdOrVarianteId);
        set({ guestItems });

        const local = recalcularCarritoLocal(guestItems, get().cupon);
        set({
          cart: local.cart,
          descuento: local.descuento,
          totalConDescuento: local.totalConDescuento,
        });

        if (isAuthenticated && isOnline) {
          try {
            await cartApi.eliminarItem(itemIdOrVarianteId);
            set({ guestItems: [] });
            await get().cargarCarrito();
          } catch (err: any) {
            console.warn('[cart.store] Error eliminando item remoto:', err);
            set({ cargando: false });
          }
        } else {
          set({ cargando: false });
        }
      },

      clearCart: async () => {
        set({ cargando: true, error: null });
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        try {
          if (isAuthenticated && isOnline) {
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
        set({ cargando: true, error: null });
        const cart = get().cart;
        const subtotal = cart ? cart.total : 0;

        if (subtotal <= 0) {
          set({ cargando: false });
          return { success: false, mensaje: 'El carrito está vacío. Agrega productos para aplicar un cupón.' };
        }

        try {
          const res = await cuponesApi.validarCupon(codigo, subtotal);
          const cupon = res.cupon;
          let descuento = 0;

          if (cupon.tipo === 'PORCENTAJE') {
            descuento = Number(((subtotal * cupon.valor) / 100).toFixed(2));
          } else {
            descuento = Math.min(cupon.valor, subtotal);
          }

          const totalConDescuento = Number(Math.max(0, subtotal - descuento).toFixed(2));

          set({
            cupon,
            descuento,
            totalConDescuento,
            mensajeCupon: res.mensaje,
            error: null,
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
        cart: state.cart,
        descuento: state.descuento,
        totalConDescuento: state.totalConDescuento,
      }),
    },
  ),
);

// Sincronizar automáticamente en cuanto el navegador detecte que volvió internet
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useCartStore.getState().cargarCarrito();
  });
}

