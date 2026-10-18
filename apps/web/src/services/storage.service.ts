/**
 * Servicio para gestión segura de caché en LocalStorage para modo offline
 */

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
}

export const STORAGE_KEYS = {
  PRODUCTOS: '@aura_cache_productos',
  CATEGORIAS: '@aura_cache_categorias',
  PRODUCTO_DETALLE: (id: string) => `@aura_cache_producto_${id}`,
  PRODUCTOS_RELACIONADOS: (id: string) => `@aura_cache_relacionados_${id}`,
} as const;

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
