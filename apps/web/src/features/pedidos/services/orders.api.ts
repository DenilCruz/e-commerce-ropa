import { api } from '../../../services/api';
import { Pedido } from '../types';

export const ordersApi = {
  // HU-49: Obtener mis pedidos (Cliente)
  obtenerMisPedidos: async (): Promise<Pedido[]> => {
    const res = await api.get<Pedido[]>('/orders/my-orders');
    return res.data;
  },

  // HU-50: Obtener detalle de pedido por ID
  obtenerDetalle: async (id: string): Promise<Pedido> => {
    const res = await api.get<Pedido>(`/orders/${id}`);
    return res.data;
  },

  // HU-51: Cancelar pedido si aún no fue enviado
  cancelarPedido: async (id: string, motivo?: string): Promise<Pedido> => {
    const res = await api.put<Pedido>(`/orders/${id}/cancel`, { motivo });
    return res.data;
  },

  // HU-53: Listar todos los pedidos (Admin)
  obtenerTodosAdmin: async (filtros?: {
    estado?: string;
    busqueda?: string;
    fechaInicio?: string;
    fechaFin?: string;
  }): Promise<Pedido[]> => {
    const res = await api.get<Pedido[]>('/orders/admin/all', { params: filtros });
    return res.data;
  },

  // HU-54 & HU-55: Actualizar estado de pedido y comentario de auditoría (Admin)
  actualizarEstadoAdmin: async (
    id: string,
    nuevoEstado: string,
    comentario?: string,
  ): Promise<Pedido> => {
    const res = await api.put<Pedido>(`/orders/admin/${id}/status`, {
      estado: nuevoEstado,
      comentario,
    });
    return res.data;
  },
};
