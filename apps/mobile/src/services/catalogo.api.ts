import { api } from './api';

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  slug?: string;
}

export interface ImagenProducto {
  id: string;
  url: string;
  principal: boolean;
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
  destacado: boolean;
  categoria?: Categoria;
  imagenes?: ImagenProducto[];
  variantes?: VarianteProducto[];
}

export const catalogoApi = {
  obtenerCategorias: async (): Promise<Categoria[]> => {
    const response = await api.get('/categorias');
    return response.data;
  },

  obtenerProductos: async (categoriaId?: string): Promise<Producto[]> => {
    const response = await api.get('/productos');
    const productos: Producto[] = response.data;
    if (categoriaId) {
      return productos.filter((p) => p.categoria?.id === categoriaId);
    }
    return productos;
  },

  obtenerProductoPorId: async (id: string): Promise<Producto> => {
    const response = await api.get(`/productos/${id}`);
    return response.data;
  },
};
