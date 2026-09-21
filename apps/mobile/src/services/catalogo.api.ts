import { api } from './api';

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
    const response = await api.get('/categorias');
    return response.data;
  },

  obtenerProductos: async (filtros?: FiltrosProductos | string): Promise<Producto[]> => {
    if (typeof filtros === 'string') {
      const response = await api.get(`/productos?categoriaId=${encodeURIComponent(filtros)}`);
      return response.data;
    }
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
    return response.data;
  },

  obtenerProductoPorId: async (id: string): Promise<Producto> => {
    const response = await api.get(`/productos/${id}`);
    return response.data;
  },

  obtenerProductosRelacionados: async (id: string): Promise<Producto[]> => {
    const response = await api.get(`/productos/${id}/relacionados`);
    return response.data;
  },

  eliminarProducto: async (id: string): Promise<void> => {
    await api.delete(`/productos/${id}`);
  },

  toggleActivo: async (id: string): Promise<Producto> => {
    const response = await api.put(`/productos/${id}/toggle`);
    return response.data;
  },
};
