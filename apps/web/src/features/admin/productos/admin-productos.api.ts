import { api } from '../../../services/api';
import { Producto } from '../../catalogo/types';

export interface CrearProductoDto {
  nombre: string;
  descripcion: string;
  destacado?: boolean;
  categoriaId: string;
  variantes: any[];
  imagenes: any[];
}

export const adminProductosApi = {
  obtenerTallas: async (): Promise<any[]> => {
    const response = await api.get('/productos/tallas');
    return response.data;
  },
  crearColor: async (nombre: string): Promise<any> => {
    const response = await api.post('/productos/colores', { nombre });
    return response.data;
  },
  obtenerColores: async (): Promise<any[]> => {
    const response = await api.get('/productos/colores');
    return response.data;
  },
  crearProducto: async (datos: CrearProductoDto): Promise<Producto> => {
    const response = await api.post('/productos', datos);
    return response.data;
  },
  actualizarProducto: async (id: string, datos: Partial<CrearProductoDto> & { activo?: boolean }): Promise<Producto> => {
    const response = await api.put(`/productos/${id}`, datos);
    return response.data;
  },
  toggleEstado: async (id: string): Promise<Producto> => {
    const response = await api.put(`/productos/${id}/toggle`);
    return response.data;
  },
  eliminarProducto: async (id: string): Promise<void> => {
    await api.delete(`/productos/${id}`);
  },
  subirImagen: async (file: File, categoriaSlug: string): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('categoria', categoriaSlug); // MUY IMPORTANTE EL ORDEN
    formData.append('imagen', file);

    const response = await api.post('/archivos/subir', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
};
