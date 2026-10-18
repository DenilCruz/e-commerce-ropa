import { api } from './api';
import { offlineCatalogService } from './offlineCatalog.service';
import { useNetworkStore } from '../store/network.store';

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  slug?: string;
  imagenUrl?: string;
  activa?: boolean;
}

export interface ImagenProducto {
  id: string;
  url: string;
  principal?: boolean;
  esPrincipal?: boolean;
}

export interface Talla {
  id: string;
  nombre: string;
}

export interface Color {
  id: string;
  nombre: string;
  hex?: string;
  codigoHex?: string;
}

export interface VarianteProducto {
  id: string;
  sku: string;
  precio?: string | number;
  precioExtra?: string | number;
  stock: number;
  talla?: Talla;
  color?: Color;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number | string;
  destacado?: boolean;
  categoria?: Categoria;
  imagenes?: ImagenProducto[];
  variantes?: VarianteProducto[];
}

export interface FiltrosProductos {
  categoriaId?: string;
  busqueda?: string;
  tallaId?: string;
  colorId?: string;
  precioMin?: number;
  precioMax?: number;
  ordenarPor?: 'precio_asc' | 'precio_desc' | 'novedad' | 'popularidad';
}

export const catalogoApi = {
  obtenerCategorias: async (): Promise<Categoria[]> => {
    const isConnected = useNetworkStore.getState().isConnected;
    if (!isConnected) {
      return offlineCatalogService.getCachedCategories();
    }

    try {
      const response = await api.get('/categorias');
      const cats: Categoria[] = response.data;
      if (Array.isArray(cats)) {
        offlineCatalogService.saveCategories(cats).catch(() => {});
      }
      return cats;
    } catch (error) {
      console.warn('[Catalogo] Error obteniendo categorías remotas. Usando caché local.');
      return offlineCatalogService.getCachedCategories();
    }
  },

  obtenerProductos: async (filtros?: FiltrosProductos | string): Promise<Producto[]> => {
    const isConnected = useNetworkStore.getState().isConnected;
    if (!isConnected) {
      return offlineCatalogService.filterCachedProducts(filtros);
    }

    try {
      let data: Producto[];
      if (typeof filtros === 'string') {
        const response = await api.get(`/productos?categoriaId=${encodeURIComponent(filtros)}`);
        data = response.data;
      } else {
        const params = new URLSearchParams();
        if (filtros?.categoriaId) params.append('categoriaId', filtros.categoriaId);
        if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
        if (filtros?.tallaId) params.append('tallaId', filtros.tallaId);
        if (filtros?.colorId) params.append('colorId', filtros.colorId);
        if (filtros?.precioMin !== undefined) params.append('precioMin', String(filtros.precioMin));
        if (filtros?.precioMax !== undefined) params.append('precioMax', String(filtros.precioMax));
        if (filtros?.ordenarPor) params.append('ordenarPor', filtros.ordenarPor);

        const query = params.toString();
        const url = query ? `/productos?${query}` : '/productos';
        const response = await api.get(url);
        data = response.data;
      }

      if (Array.isArray(data)) {
        // Si no hay filtros complejos de búsqueda, almacenar en la base de datos local
        if (!filtros || typeof filtros === 'string') {
          offlineCatalogService.saveProducts(data).catch(() => {});
        }
      }

      return data;
    } catch (error) {
      console.warn('[Catalogo] Error obteniendo productos remotos. Usando caché local.');
      return offlineCatalogService.filterCachedProducts(filtros);
    }
  },

  obtenerProductoPorId: async (id: string): Promise<Producto> => {
    const isConnected = useNetworkStore.getState().isConnected;
    if (!isConnected) {
      const cached = await offlineCatalogService.getCachedProductDetail(id);
      if (cached) return cached;
    }

    try {
      const response = await api.get(`/productos/${id}`);
      const prod: Producto = response.data;
      if (prod && prod.id) {
        offlineCatalogService.saveProductDetail(prod).catch(() => {});
      }
      return prod;
    } catch (error) {
      console.warn(`[Catalogo] Error obteniendo producto ${id}. Usando caché local.`);
      const cached = await offlineCatalogService.getCachedProductDetail(id);
      if (cached) return cached;
      throw error;
    }
  },

  obtenerProductosRelacionados: async (id: string): Promise<Producto[]> => {
    const isConnected = useNetworkStore.getState().isConnected;
    if (!isConnected) {
      return offlineCatalogService.getCachedRelatedProducts(id);
    }

    try {
      const response = await api.get(`/productos/${id}/relacionados`);
      const rels: Producto[] = response.data;
      if (Array.isArray(rels)) {
        offlineCatalogService.saveRelatedProducts(id, rels).catch(() => {});
      }
      return rels;
    } catch (error) {
      return offlineCatalogService.getCachedRelatedProducts(id);
    }
  },

  eliminarProducto: async (id: string): Promise<void> => {
    await api.delete(`/productos/${id}`);
  },

  toggleActivo: async (id: string): Promise<Producto> => {
    const response = await api.put(`/productos/${id}/toggle`);
    return response.data;
  },
};
