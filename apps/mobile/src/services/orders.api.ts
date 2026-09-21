import { api } from './api';

export interface PedidoItem {
  id: string;
  productoId: string;
  nombre: string;
  talla: string;
  color: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  imagen?: string | null;
}

export interface PedidoEnvio {
  id: string;
  numeroTracking: string;
  estado: string;
  empresaTransportadora?: string;
  direccionTexto?: string;
}

export interface HistorialAuditoria {
  id: string;
  estadoAnterior?: string;
  estadoNuevo: string;
  comentario?: string;
  creadoEn: string;
  autor?: string;
}

export interface Pedido {
  id: string;
  nro: string;
  fecha: string;
  estado: 'PENDIENTE' | 'PAGADO' | 'COMPLETADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO' | 'REEMBOLSADO';
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  cupon?: any;
  pago: {
    id: string;
    monto: number;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'REEMBOLSADO';
    idTransaccion?: string;
    metodoPago?: string;
    fechaPago?: string;
  } | null;
  envio?: PedidoEnvio | null;
  historial?: HistorialAuditoria[];
  items: PedidoItem[];
}

export const ordersApi = {
  // HU-49: Obtener mis pedidos
  obtenerMisPedidos: async (): Promise<Pedido[]> => {
    const res = await api.get<Pedido[]>('/orders/my-orders');
    return res.data;
  },

  // HU-50: Obtener detalle
  obtenerDetalle: async (id: string): Promise<Pedido> => {
    const res = await api.get<Pedido>(`/orders/${id}`);
    return res.data;
  },

  // HU-51: Cancelar pedido
  cancelarPedido: async (id: string, motivo?: string): Promise<Pedido> => {
    const res = await api.put<Pedido>(`/orders/${id}/cancel`, { motivo });
    return res.data;
  },
};
