import { api } from './api';

export interface UsuarioResena {
  id: string;
  nombre: string;
  apellido: string;
  foto?: string;
}

export interface Resena {
  id: string;
  productoId: string;
  usuarioId: string;
  calificacion: number;
  comentario: string;
  aprobada: boolean;
  creadoEn: string;
  usuario?: UsuarioResena;
}

export interface ResumenResenas {
  promedio: number;
  total: number;
  distribucion: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface EstadoCompraResena {
  puedeCalificar: boolean;
  comproProducto: boolean;
  yaReseno: boolean;
  resenaExistente?: Resena;
}

export const resenasApi = {
  obtenerPorProducto: async (productoId: string): Promise<Resena[]> => {
    const response = await api.get(`/resenas/producto/${productoId}`);
    return response.data;
  },

  obtenerResumenProducto: async (productoId: string): Promise<ResumenResenas> => {
    const response = await api.get(`/resenas/producto/${productoId}/resumen`);
    return response.data;
  },

  verificarCompra: async (
    productoId: string,
    usuarioId: string,
  ): Promise<EstadoCompraResena> => {
    const response = await api.get(`/resenas/verificar-compra/${productoId}/${usuarioId}`);
    return response.data;
  },

  crear: async (payload: {
    productoId: string;
    usuarioId: string;
    calificacion: number;
    comentario: string;
  }): Promise<Resena> => {
    const response = await api.post('/resenas', payload);
    return response.data;
  },

  eliminar: async (id: string, usuarioId: string): Promise<void> => {
    await api.delete(`/resenas/${id}?usuarioId=${usuarioId}`);
  },

  simularCompra: async (productoId: string, usuarioId: string): Promise<any> => {
    const response = await api.post('/resenas/simular-compra', { productoId, usuarioId });
    return response.data;
  },
};
