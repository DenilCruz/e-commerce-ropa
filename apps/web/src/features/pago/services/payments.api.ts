import { api } from '../../../services/api';
import {
  MetodoPago,
  CrearIntentoResponse,
  OrdenRespuesta,
  ReembolsoResponse,
} from '../types';
import { ClavePago, encabezadoIdempotencia, firmaIntentoPago, recordarClave } from './idempotencyKey';

const reembolsos = new Map<string, ClavePago>();

function claveReembolso(orderId: string, motivo: string | undefined, explicita?: string): string {
  if (explicita) return explicita;
  return recordarClave(reembolsos, orderId, firmaIntentoPago({ motivo: motivo ?? '' }, 0), () => crypto.randomUUID());
}

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
  }, idempotencyKey: string): Promise<CrearIntentoResponse> => {
    const res = await api.post<CrearIntentoResponse>('/payments/intent', datos, encabezadoIdempotencia(idempotencyKey));
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
  }, idempotencyKey: string): Promise<OrdenRespuesta> => {
    const res = await api.post<OrdenRespuesta>('/payments/confirm-card', datos, encabezadoIdempotencia(idempotencyKey));
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
  }, idempotencyKey: string): Promise<OrdenRespuesta> => {
    const res = await api.post<OrdenRespuesta>('/payments/cash-on-delivery', datos, encabezadoIdempotencia(idempotencyKey));
    return res.data;
  },

  // HU-57: Consultar estado de pago y comprobante
  simularPagoQr: async (datos: {
    solicitudId: string;
    direccionEnvio: string;
    telefono: string;
    cuponId?: string;
    metodoEnvioId?: string;
    tipoEnvio: string;
  }, idempotencyKey: string): Promise<{ referencia: string; monto: number }> => {
    const res = await api.post('/payments/qr/simular', datos, encabezadoIdempotencia(idempotencyKey));
    return res.data;
  },

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
  }, idempotencyKey: string): Promise<{ clientSecret: string; sessionId: string; amount: number; currency: string }> => {
    const res = await api.post('/payments/embedded-session', datos, encabezadoIdempotencia(idempotencyKey));
    return res.data;
  },

  // HU-57 / HU-58: Consultar estado de sesión embebida y obtener orden
  consultarEstadoSesion: async (sessionId: string): Promise<{ status: string; paymentStatus: string; orden: OrdenRespuesta | null }> => {
    const res = await api.get(`/payments/session-status/${sessionId}`);
    return res.data;
  },

  // HU-59: Reembolsar pago (Admin)
  reembolsarPago: async (orderId: string, motivo?: string, idempotencyKey?: string): Promise<ReembolsoResponse> => {
    const res = await api.post<ReembolsoResponse>(
      `/payments/refund/${orderId}`,
      { motivo },
      encabezadoIdempotencia(claveReembolso(orderId, motivo, idempotencyKey)),
    );
    return res.data;
  },
};
