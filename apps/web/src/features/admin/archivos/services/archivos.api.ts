import { api } from '../../../../services/api';
import { ArchivoMultimedia, EstadoCloudinary, ResultadoSubida, ResultadoLimpieza } from '../types';

export const archivosApi = {
  obtenerEstadoCloudinary: async (): Promise<EstadoCloudinary> => {
    const response = await api.get('/archivos/estado-cloudinary');
    return response.data;
  },

  subirArchivo: async (file: File, categoria: string = 'productos'): Promise<ResultadoSubida> => {
    const formData = new FormData();
    formData.append('categoria', categoria);
    formData.append('imagen', file);

    const response = await api.post('/archivos/subir', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  obtenerArchivos: async (
    categoria?: string,
    filtroUso?: 'todos' | 'en_uso' | 'obsoleto',
  ): Promise<ArchivoMultimedia[]> => {
    const params: Record<string, string> = {};
    if (categoria && categoria !== 'todas') params.categoria = categoria;
    if (filtroUso && filtroUso !== 'todos') params.filtroUso = filtroUso;

    const response = await api.get('/archivos', { params });
    return response.data;
  },

  eliminarArchivo: async (id: string): Promise<{ exito: boolean; mensaje: string }> => {
    const response = await api.delete(`/archivos/${encodeURIComponent(id)}`);
    return response.data;
  },

  limpiarObsoletas: async (): Promise<ResultadoLimpieza> => {
    const response = await api.delete('/archivos/obsoletas');
    return response.data;
  },
};
