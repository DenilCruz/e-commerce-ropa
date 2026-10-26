import React, { useEffect } from 'react';
import { useParams, Outlet } from 'react-router-dom';

/**
 * Resuelve y activa el inquilino (tienda) basado en la ruta /t/:slug.
 * Almacena el slug en localStorage para que el interceptor de Axios (api.ts)
 * envíe la cabecera X-Tenant-Slug en todas las consultas públicas (catálogo, productos, etc.).
 */
export const TenantStoreResolver: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    if (slug) {
      localStorage.setItem('tenant_slug', slug);
    }
  }, [slug]);

  // key={slug} garantiza que al cambiar de /t/tienda-a a /t/tienda-b,
  // todos los componentes hijos se desmonten y vuelvan a montar limpiamente
  return (
    <div key={slug || 'store-root'}>
      <Outlet />
    </div>
  );
};
