import { api } from '../../../services/api';
import { Producto, Categoria } from '../types';

export const obtenerProductos = async (): Promise<Producto[]> => {
  const response = await api.get('/productos');
  return response.data;
};

export const obtenerCategorias = async (): Promise<Categoria[]> => {
  const response = await api.get('/categorias');
  return response.data;
};

export const obtenerProductoPorId = async (id: string): Promise<Producto> => {
  const response = await api.get(`/productos/${id}`);
  return response.data;
};

export const obtenerProductosRelacionados = async (id: string): Promise<Producto[]> => {
  const response = await api.get(`/productos/${id}/relacionados`);
  return response.data;
};
