import { api } from '../../../services/api';
import { Pedido } from '../types';

export const ordersApi = {
  // HU-57: Obtener mis pedidos (Cliente)
  obtenerMisPedidos: async (): Promise<Pedido[]> => {
    const res = await api.get<Pedido[]>('/orders/my-orders');
    return res.data;
  },

  // Obtener detalle de pedido por ID
  obtenerDetalle: async (id: string): Promise<Pedido> => {
    const res = await api.get<Pedido>(`/orders/${id}`);
    return res.data;
  },

  // Listar todos los pedidos (Admin)
  obtenerTodosAdmin: async (filtros?: {
    estado?: string;
    busqueda?: string;
    fechaInicio?: string;
    fechaFin?: string;
  }): Promise<Pedido[]> => {
    const res = await api.get<Pedido[]>('/orders/admin/all', { params: filtros });
    return res.data;
  },

  // Actualizar estado de pedido (Admin)
  actualizarEstadoAdmin: async (id: string, nuevoEstado: string): Promise<Pedido> => {
    const res = await api.put<Pedido>(`/orders/admin/${id}/status`, { estado: nuevoEstado });
    return res.data;
  },
};
