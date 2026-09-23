import { api } from './api';

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
  cupon?: any;
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
  envio?: {
    id: string;
    numeroTracking: string;
    estado: string;
    empresaTransportadora?: string;
  } | null;
  pago: {
    id: string;
    monto: number;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'REEMBOLSADO';
    idTransaccion?: string;
    metodoPago?: string;
    fechaPago?: string;
  } | null;
  items: Array<{
    id: string;
    productoId: string;
    nombre: string;
    talla: string;
    color: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }>;
}

export const paymentsApi = {
  listarMetodos: async (): Promise<MetodoPago[]> => {
    const res = await api.get<MetodoPago[]>('/payments/metodos');
    return res.data;
  },

  crearIntento: async (datos: {
    direccionEnvio?: string;
    telefono?: string;
    notas?: string;
    cuponId?: string;
    metodoEnvioId?: string;
    tipoEnvio?: string;
  }): Promise<CrearIntentoResponse> => {
    const res = await api.post<CrearIntentoResponse>('/payments/intent', datos);
    return res.data;
  },

  confirmarTarjeta: async (datos: {
    paymentIntentId: string;
    direccionEnvio?: string;
    telefono?: string;
    notas?: string;
    cuponId?: string;
    metodoEnvioId?: string;
    tipoEnvio?: string;
  }): Promise<OrdenRespuesta> => {
    const res = await api.post<OrdenRespuesta>('/payments/confirm-card', datos);
    return res.data;
  },

  pagoContraEntrega: async (datos: {
    direccionEnvio?: string;
    telefono?: string;
    notas?: string;
    cuponId?: string;
    metodoEnvioId?: string;
    tipoEnvio?: string;
  }): Promise<OrdenRespuesta> => {
    const res = await api.post<OrdenRespuesta>('/payments/cash-on-delivery', datos);
    return res.data;
  },

  pagoQr: async (datos: {
    direccionEnvio?: string;
    telefono?: string;
    notas?: string;
    nroComprobante?: string;
    cuponId?: string;
    metodoEnvioId?: string;
    tipoEnvio?: string;
  }): Promise<OrdenRespuesta> => {
    const res = await api.post<OrdenRespuesta>('/payments/qr', datos);
    return res.data;
  },

  crearSesionEmbebida: async (datos: {
    direccionEnvio?: string;
    telefono?: string;
    notas?: string;
    cuponId?: string;
    metodoEnvioId?: string;
    tipoEnvio?: string;
  }): Promise<{ clientSecret: string; sessionId: string; amount: number; currency: string }> => {
    const res = await api.post('/payments/embedded-session', datos);
    return res.data;
  },

  consultarEstadoSesion: async (sessionId: string): Promise<{ status: string; paymentStatus: string; orden: OrdenRespuesta | null }> => {
    const res = await api.get(`/payments/session-status/${sessionId}`);
    return res.data;
  },

  consultarEstado: async (orderId: string): Promise<OrdenRespuesta> => {
    const res = await api.get<OrdenRespuesta>(`/payments/status/${orderId}`);
    return res.data;
  },
};

