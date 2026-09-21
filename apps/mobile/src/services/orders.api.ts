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
  items: PedidoItem[];
}

export const ordersApi = {
  obtenerMisPedidos: async (): Promise<Pedido[]> => {
    const res = await api.get<Pedido[]>('/orders/my-orders');
    return res.data;
  },

  obtenerDetalle: async (id: string): Promise<Pedido> => {
    const res = await api.get<Pedido>(`/orders/${id}`);
    return res.data;
  },
};
