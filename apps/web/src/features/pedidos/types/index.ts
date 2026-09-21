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

export interface PedidoPago {
  id: string;
  monto: number;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'REEMBOLSADO';
  idTransaccion?: string;
  metodoPago?: string;
  fechaPago?: string;
  respuestaPasarela?: any;
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
  cupon?: {
    id: string;
    codigo: string;
    tipo: string;
    valor: number;
  } | null;
  pago: PedidoPago | null;
  items: PedidoItem[];
  usuario?: {
    id: string;
    nombre: string;
    correo: string;
    celular?: string;
  };
}
