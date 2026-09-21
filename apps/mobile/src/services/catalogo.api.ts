import { api } from './api';

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
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
  hex: string;
}

export interface VarianteProducto {
  id: string;
  sku: string;
  precio: string;
  stock: number;
  talla?: Talla;
  color?: Color;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  destacado: boolean;
  categoria: Categoria;
  imagenes: ImagenProducto[];
  variantes: VarianteProducto[];
}

export const catalogoApi = {
  obtenerCategorias: async (): Promise<Categoria[]> => {
    const response = await api.get('/catalogo/categorias');
    return response.data;
  },

  obtenerProductos: async (categoriaId?: string): Promise<Producto[]> => {
    const url = categoriaId ? `/catalogo/productos?categoriaId=${categoriaId}` : '/catalogo/productos';
    const response = await api.get(url);
    return response.data;
  },

  obtenerProductoPorId: async (id: string): Promise<Producto> => {
    const response = await api.get(`/catalogo/productos/${id}`);
    return response.data;
  }
};
