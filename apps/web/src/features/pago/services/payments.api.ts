import { api } from '../../../services/api';
import {
  MetodoPago,
  CrearIntentoResponse,
  OrdenRespuesta,
  ReembolsoResponse,
} from '../types';

export const paymentsApi = {
  // Listar métodos de pago
  listarMetodos: async (): Promise<MetodoPago[]> => {
    const res = await api.get<MetodoPago[]>('/payments/metodos');
    return res.data;
  },

  // HU-56: Crear PaymentIntent con Stripe
  crearIntento: async (datos: {
    direccionEnvio?: string;
    telefono?: string;
    notas?: string;
    cuponId?: string;
    metodoEnvioId?: string;
    tipoEnvio?: string;
    latitud?: number;
    longitud?: number;
  }): Promise<CrearIntentoResponse> => {
    const res = await api.post<CrearIntentoResponse>('/payments/intent', datos);
    return res.data;
  },

  // HU-56 / HU-58: Confirmar pago con tarjeta
  confirmarTarjeta: async (datos: {
    paymentIntentId: string;
    direccionEnvio?: string;
    telefono?: string;
    notas?: string;
    cuponId?: string;
    metodoEnvioId?: string;
    tipoEnvio?: string;
    latitud?: number;
    longitud?: number;
  }): Promise<OrdenRespuesta> => {
    const res = await api.post<OrdenRespuesta>('/payments/confirm-card', datos);
    return res.data;
  },

  // HU-60: Pago Contra Entrega (Efectivo)
  pagoContraEntrega: async (datos: {
    direccionEnvio?: string;
    telefono?: string;
    notas?: string;
    cuponId?: string;
    metodoEnvioId?: string;
    tipoEnvio?: string;
    latitud?: number;
    longitud?: number;
  }): Promise<OrdenRespuesta> => {
    const res = await api.post<OrdenRespuesta>('/payments/cash-on-delivery', datos);
    return res.data;
  },

  // HU-57: Consultar estado de pago y comprobante
  consultarEstado: async (orderId: string): Promise<OrdenRespuesta> => {
    const res = await api.get<OrdenRespuesta>(`/payments/status/${orderId}`);
    return res.data;
  },

  // HU-56: Crear sesión de Stripe Embedded Checkout
  crearSesionEmbebida: async (datos: {
    direccionEnvio?: string;
    telefono?: string;
    notas?: string;
    cuponId?: string;
    metodoEnvioId?: string;
    tipoEnvio?: string;
    latitud?: number;
    longitud?: number;
  }): Promise<{ clientSecret: string; sessionId: string; amount: number; currency: string }> => {
    const res = await api.post('/payments/embedded-session', datos);
    return res.data;
  },

  // HU-57 / HU-58: Consultar estado de sesión embebida y obtener orden
  consultarEstadoSesion: async (sessionId: string): Promise<{ status: string; paymentStatus: string; orden: OrdenRespuesta | null }> => {
    const res = await api.get(`/payments/session-status/${sessionId}`);
    return res.data;
  },

  // HU-59: Reembolsar pago (Admin)
  reembolsarPago: async (orderId: string, motivo?: string): Promise<ReembolsoResponse> => {
    const res = await api.post<ReembolsoResponse>(`/payments/refund/${orderId}`, { motivo });
    return res.data;
  },
};
