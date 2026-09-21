import { api } from '../../../services/api';
import { Categoria } from '../../catalogo/types';

export interface CrearCategoriaPayload {
  nombre: string;
  descripcion?: string;
  padre_id?: string | null;
  imagen?: string | null;
  activa?: boolean;
  orden?: number;
}

export interface ActualizarCategoriaPayload extends Partial<CrearCategoriaPayload> {}

export const adminCategoriasApi = {
  obtenerCategorias: async (): Promise<Categoria[]> => {
    const response = await api.get('/categorias');
    return response.data;
  },

  obtenerCategoriasPlano: async (): Promise<Categoria[]> => {
    const response = await api.get('/categorias/plano');
    return response.data;
  },

  obtenerPorId: async (id: string): Promise<Categoria> => {
    const response = await api.get(`/categorias/${id}`);
    return response.data;
  },

  crearCategoria: async (datos: CrearCategoriaPayload): Promise<Categoria> => {
    const response = await api.post('/categorias', datos);
    return response.data;
  },

  actualizarCategoria: async (id: string, datos: ActualizarCategoriaPayload): Promise<Categoria> => {
    const response = await api.put(`/categorias/${id}`, datos);
    return response.data;
  },

  toggleEstado: async (id: string): Promise<Categoria> => {
    const response = await api.put(`/categorias/${id}/toggle`);
    return response.data;
  },

  eliminarCategoria: async (id: string): Promise<void> => {
    await api.delete(`/categorias/${id}`);
  },

  subirImagen: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('categoria', 'categorias');
    formData.append('imagen', file);

    const response = await api.post('/archivos/subir', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
