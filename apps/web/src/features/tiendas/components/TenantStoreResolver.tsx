import React, { useEffect, useState } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth.store';
import { useCartStore } from '../../../store/cart.store';
import { tiendasApi } from '../services/tiendas.api';

/**
 * Resuelve y activa el inquilino (tienda) basado en la ruta /t/:slug.
 * Almacena el slug en localStorage para que el interceptor de Axios (api.ts)
 * envíe la cabecera X-Tenant-Slug en todas las consultas públicas (catálogo, productos, etc.).
 * Además, si el usuario autenticado es miembro/dueño de esta tienda, cambia su sesión activa a ella.
 */
export const TenantStoreResolver: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, setAuth } = useAuthStore();
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const normalizedSlug = slug.toLowerCase().trim();
    localStorage.setItem('tenant_slug', normalizedSlug);

    // Aislar carrito para que no muestre items de otra tienda
    useCartStore.getState().ensureTenantCart(normalizedSlug);

    // Si el usuario está autenticado, verificar si pertenece a la tienda actual (/t/:slug)
    // y si su token aún apunta a otra tienda, cambiar su sesión activa automáticamente
    if (isAuthenticated) {
      let montado = true;
      setSincronizando(true);
      tiendasApi
        .listarMias()
        .then(async (misTiendas) => {
          const coincidencia = misTiendas.find((t) => t.slug.toLowerCase() === normalizedSlug);
          if (coincidencia) {
            localStorage.setItem('tenant_slug', coincidencia.slug);
            if (!coincidencia.esActiva) {
              const sesion = await tiendasApi.seleccionar(coincidencia.id);
              if (montado) {
                setAuth(sesion.usuario, sesion.accessToken, sesion.refreshToken);
                useCartStore.getState().ensureTenantCart(coincidencia.slug);
              }
            }
          }
        })
        .catch(() => {
          // Si falla o no pertenece, navega como visitante de esa tienda
        })
        .finally(() => {
          if (montado) setSincronizando(false);
        });

      return () => {
        montado = false;
      };
    }
  }, [slug, isAuthenticated, setAuth]);

  // key={slug} garantiza que al cambiar de /t/tienda-a a /t/tienda-b,
  // todos los componentes hijos se desmonten y vuelvan a montar limpiamente
  return (
    <div key={slug || 'store-root'} data-syncing={sincronizando ? 'true' : 'false'}>
      <Outlet />
    </div>
  );
};
