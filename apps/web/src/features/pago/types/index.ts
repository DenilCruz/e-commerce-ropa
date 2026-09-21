export interface MetodoPago {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface CrearIntentoResponse {
  clientSecret: string;
  paymentIntentId: string;
  monto: number;
  moneda: string;
  subtotal: number;
  descuento: number;
  envio: number;
  totalFinal: number;
  cupon?: {
    id: string;
    codigo: string;
    valor: number;
  } | null;
}

export interface OrdenItemPago {
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

export interface PagoDetalle {
  id: string;
  monto: number;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'REEMBOLSADO';
  idTransaccion?: string;
  metodoPago?: string;
  fechaPago?: string;
  respuestaPasarela?: any;
}

export interface OrdenRespuesta {
  ordenId: string;
  nroOrden: string;
  fecha: string;
  estadoOrden: string;
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  pago: PagoDetalle | null;
  envio?: {
    id: string;
    numeroTracking: string;
    estado: string;
    empresaTransportadora?: string;
  } | null;
  items: OrdenItemPago[];
  usuario?: {
    id: string;
    nombre: string;
    correo: string;
    celular?: string;
  };
}

export interface ReembolsoResponse {
  success: boolean;
  mensaje: string;
  ordenId: string;
  nroOrden: string;
  montoReembolsado: number;
  estadoPago: string;
  estadoOrden: string;
  stripeRefundId?: string | null;
  fechaReembolso: string;
}
