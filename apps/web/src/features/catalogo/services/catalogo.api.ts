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
