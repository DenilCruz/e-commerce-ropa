import { useLocation } from 'react-router-dom';

export interface UseTenantStoreReturn {
  slug: string;
  urlSlug: string | null;
  storePrefix: string;
  isStoreContext: boolean;
  getStoreUrl: (subpath?: string) => string;
}

/**
 * Hook para resolver la tienda activa y generar URLs contextuales
 * garantizando que la navegación nunca pierda el prefijo /t/:slug
 */
export const useTenantStore = (): UseTenantStoreReturn => {
  const location = useLocation();
  const matchTenant = location.pathname.match(/^\/t\/([^/]+)/);
  const urlSlug = matchTenant ? matchTenant[1] : null;
  const storedSlug = typeof window !== 'undefined' ? localStorage.getItem('tenant_slug') : null;
  const currentSlug = urlSlug || storedSlug || 'aura';
  const storePrefix = `/t/${currentSlug}`;

  const getStoreUrl = (subpath: string = ''): string => {
    if (!subpath || subpath === '/') {
      return storePrefix;
    }
    const cleanSubpath = subpath.startsWith('/') ? subpath : `/${subpath}`;
    return `${storePrefix}${cleanSubpath}`;
  };

  return {
    slug: currentSlug,
    urlSlug,
    storePrefix,
    isStoreContext: Boolean(urlSlug),
    getStoreUrl,
  };
};

