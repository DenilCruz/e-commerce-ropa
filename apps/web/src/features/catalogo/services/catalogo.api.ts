import { api } from '../../../services/api';
import { Producto, Categoria } from '../types';
import { storageService, STORAGE_KEYS } from '../../../services/storage.service';

export const obtenerProductos = async (): Promise<Producto[]> => {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline) {
    try {
      const response = await api.get('/productos');
      if (Array.isArray(response.data)) {
        storageService.setCache(STORAGE_KEYS.PRODUCTOS, response.data);
      }
      return response.data;
    } catch (error) {
      console.warn('[catalogo.api] Falló petición remota de productos, usando caché offline:', error);
      const cached = storageService.getCache<Producto[]>(STORAGE_KEYS.PRODUCTOS);
      if (cached && cached.length > 0) {
        return cached;
      }
      throw error;
    }
  }

  // Modo offline activo
  const cached = storageService.getCache<Producto[]>(STORAGE_KEYS.PRODUCTOS);
  if (cached && cached.length > 0) {
    return cached;
  }
  return [];
};

export const obtenerCategorias = async (): Promise<Categoria[]> => {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline) {
    try {
      const response = await api.get('/categorias');
      if (Array.isArray(response.data)) {
        storageService.setCache(STORAGE_KEYS.CATEGORIAS, response.data);
      }
      return response.data;
    } catch (error) {
      console.warn('[catalogo.api] Falló petición remota de categorías, usando caché offline:', error);
      const cached = storageService.getCache<Categoria[]>(STORAGE_KEYS.CATEGORIAS);
      if (cached && cached.length > 0) {
        return cached;
      }
      throw error;
    }
  }

  // Modo offline activo
  const cached = storageService.getCache<Categoria[]>(STORAGE_KEYS.CATEGORIAS);
  if (cached && cached.length > 0) {
    return cached;
  }
  return [];
};

export const obtenerProductoPorId = async (id: string): Promise<Producto> => {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline) {
    try {
      const response = await api.get(`/productos/${id}`);
      if (response.data) {
        storageService.setCache(STORAGE_KEYS.PRODUCTO_DETALLE(id), response.data);
      }
      return response.data;
    } catch (error) {
      console.warn(`[catalogo.api] Falló petición de producto ${id}, usando caché offline:`, error);
      const cached = storageService.getCache<Producto>(STORAGE_KEYS.PRODUCTO_DETALLE(id));
      if (cached) {
        return cached;
      }
      // Intento de fallback desde la lista general en caché
      const cachedList = storageService.getCache<Producto[]>(STORAGE_KEYS.PRODUCTOS);
      const itemFromList = cachedList?.find((p) => p.id === id);
      if (itemFromList) {
        return itemFromList;
      }
      throw error;
    }
  }

  // Modo offline activo
  const cached = storageService.getCache<Producto>(STORAGE_KEYS.PRODUCTO_DETALLE(id));
  if (cached) {
    return cached;
  }

  const cachedList = storageService.getCache<Producto[]>(STORAGE_KEYS.PRODUCTOS);
  const itemFromList = cachedList?.find((p) => p.id === id);
  if (itemFromList) {
    return itemFromList;
  }

  throw new Error('Producto no disponible en modo sin conexión.');
};

export const obtenerProductosRelacionados = async (id: string): Promise<Producto[]> => {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline) {
    try {
      const response = await api.get(`/productos/${id}/relacionados`);
      if (Array.isArray(response.data)) {
        storageService.setCache(STORAGE_KEYS.PRODUCTOS_RELACIONADOS(id), response.data);
      }
      return response.data;
    } catch (error) {
      console.warn(`[catalogo.api] Falló petición de relacionados para ${id}, usando caché:`, error);
      const cached = storageService.getCache<Producto[]>(STORAGE_KEYS.PRODUCTOS_RELACIONADOS(id));
      if (cached && cached.length > 0) {
        return cached;
      }
      return [];
    }
  }

  // Modo offline activo
  const cached = storageService.getCache<Producto[]>(STORAGE_KEYS.PRODUCTOS_RELACIONADOS(id));
  if (cached && cached.length > 0) {
    return cached;
  }

  // Fallback: tomar 4 productos de la lista general cacheados distintos del actual
  const allCached = storageService.getCache<Producto[]>(STORAGE_KEYS.PRODUCTOS) || [];
  return allCached.filter((p) => p.id !== id).slice(0, 4);
};
