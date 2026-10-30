/**
 * Servicio para gestión segura de caché en LocalStorage para modo offline
 * Aislado por tienda (inquilino) para prevenir contaminación cruzada de datos
 */

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
}

const getTenantPrefix = (): string => {
  if (typeof window === 'undefined') return '@aura_aura';
  const match = window.location.pathname.match(/\/t\/([^/]+)/);
  const slug = match ? match[1] : (localStorage.getItem('tenant_slug') || 'aura');
  return `@aura_${slug}`;
};

export const STORAGE_KEYS = {
  get PRODUCTOS() {
    return `${getTenantPrefix()}_cache_productos`;
  },
  get CATEGORIAS() {
    return `${getTenantPrefix()}_cache_categorias`;
  },
  PRODUCTO_DETALLE: (id: string) => `${getTenantPrefix()}_cache_producto_${id}`,
  PRODUCTOS_RELACIONADOS: (id: string) => `${getTenantPrefix()}_cache_relacionados_${id}`,
};

export const storageService = {
  /**
   * Guarda un objeto con timestamp en localStorage
   */
  setCache: <T>(key: string, data: T): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const envelope: CacheEnvelope<T> = {
        data,
        timestamp: Date.now(),
      };
      window.localStorage.setItem(key, JSON.stringify(envelope));
    } catch (error) {
      console.warn(`[storageService] Error guardando caché para "${key}":`, error);
    }
  },

  /**
   * Recupera un objeto del localStorage
   */
  getCache: <T>(key: string): T | null => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;

      const parsed: CacheEnvelope<T> = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'data' in parsed) {
        return parsed.data;
      }
      return parsed as unknown as T;
    } catch (error) {
      console.warn(`[storageService] Error leyendo caché para "${key}":`, error);
      return null;
    }
  },

  /**
   * Elimina una clave de caché
   */
  removeCache: (key: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[storageService] Error eliminando caché para "${key}":`, error);
    }
  },
};
