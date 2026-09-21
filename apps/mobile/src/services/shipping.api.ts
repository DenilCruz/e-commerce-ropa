import { api } from './api';

export interface MetodoEnvio {
  id: string;
  nombre: string;
  descripcion?: string;
  costo: number;
  tiempoEstimado: string;
  activo: boolean;
}

export interface CotizacionEnvio {
  subtotal: number;
  umbralEnvioGratis: number;
  calificaEnvioGratis: boolean;
  montoFaltanteParaGratis: number;
  metodoSeleccionado: any;
  opciones: any[];
}

export interface TrackingInfo {
  id: string;
  numeroTracking: string;
  estado: 'PREPARANDO' | 'EN_CAMINO' | 'EN_REPARTO' | 'ENTREGADO' | 'CANCELADO';
  empresaTransportadora: string;
  direccionEntrega: string;
  metodoEnvio: string;
  fechas: {
    creadoEn: string;
    fechaEnvio?: string;
    fechaEntregaEstimada?: string;
    fechaEntregaReal?: string;
  };
  timeline: Array<{
    paso: number;
    codigo: string;
    titulo: string;
    descripcion: string;
    completado: boolean;
    actual: boolean;
    fecha: string | null;
  }>;
  orden: {
    id: string;
    nro: string;
    total: number;
    estado: string;
    cliente: string;
    items: any[];
  };
  mapa: {
    origen: { nombre: string; lat: number; lng: number; descripcion: string };
    destino: { nombre: string; lat: number; lng: number; descripcion: string };
    puntosRuta: Array<{ nombre: string; lat: number; lng: number; descripcion: string }>;
    posicionRepartidor: { nombre: string; lat: number; lng: number; descripcion: string };
  };
}

export const shippingApi = {
  obtenerMetodos: async (): Promise<MetodoEnvio[]> => {
    const res = await api.get('/shipping/methods');
    return res.data;
  },

  cotizarEnvio: async (subtotal: number, metodoEnvioId?: string): Promise<CotizacionEnvio> => {
    const res = await api.post('/shipping/quote', { subtotal, metodoEnvioId });
    return res.data;
  },

  consultarTracking: async (codigo: string): Promise<TrackingInfo> => {
    const res = await api.get(`/shipping/track/${encodeURIComponent(codigo)}`);
    return res.data;
  },
};
