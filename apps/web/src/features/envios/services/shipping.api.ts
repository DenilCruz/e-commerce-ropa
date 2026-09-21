import { api } from '../../../services/api';

export interface MetodoEnvio {
  id: string;
  nombre: string;
  descripcion?: string;
  costo: number;
  tiempoEstimado: string;
  activo: boolean;
}

export interface CotizacionOpcion {
  id: string;
  nombre: string;
  descripcion?: string;
  tiempoEstimado: string;
  costoOriginal: number;
  costoFinal: number;
  esGratis: boolean;
  esEstandar: boolean;
  esExpress: boolean;
}

export interface CotizacionEnvio {
  subtotal: number;
  umbralEnvioGratis: number;
  calificaEnvioGratis: boolean;
  montoFaltanteParaGratis: number;
  metodoSeleccionado: CotizacionOpcion;
  opciones: CotizacionOpcion[];
  departamento: string;
  ciudad: string;
}

export interface TrackingTimelineItem {
  paso: number;
  codigo: 'PREPARANDO' | 'EN_CAMINO' | 'EN_REPARTO' | 'ENTREGADO';
  titulo: string;
  descripcion: string;
  completado: boolean;
  actual: boolean;
  fecha: string | null;
  icono: string;
}

export interface GeoPunto {
  nombre: string;
  lat: number;
  lng: number;
  descripcion: string;
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
  timeline: TrackingTimelineItem[];
  orden: {
    id: string;
    nro: string;
    total: number;
    estado: string;
    cliente: string;
    items: Array<{
      id: string;
      nombre: string;
      talla?: string;
      color?: string;
      cantidad: number;
      subtotal: number;
    }>;
  };
  mapa: {
    origen: GeoPunto;
    destino: GeoPunto;
    puntosRuta: GeoPunto[];
    posicionRepartidor: GeoPunto;
  };
}

export interface ActualizarEstadoEnvioDto {
  estadoEnvio: 'PREPARANDO' | 'EN_CAMINO' | 'EN_REPARTO' | 'ENTREGADO' | 'FALLIDO';
  transportadora?: string;
  numeroGuia?: string;
  ubicacionActual?: string;
  notas?: string;
}

export const shippingApi = {
  // HU-63: Listar métodos de envío activos
  obtenerMetodos: async (): Promise<MetodoEnvio[]> => {
    const { data } = await api.get('/shipping/methods');
    return data;
  },

  // HU-62: Cotizar costo de envío
  cotizarEnvio: async (subtotal: number, metodoEnvioId?: string): Promise<CotizacionEnvio> => {
    const { data } = await api.post('/shipping/quote', { subtotal, metodoEnvioId });
    return data;
  },

  // HU-64: Rastrear envío por tracking o nro de orden
  consultarTracking: async (codigo: string): Promise<TrackingInfo> => {
    const { data } = await api.get(`/shipping/track/${encodeURIComponent(codigo)}`);
    return data;
  },

  // ADMIN
  listarTodosAdmin: async (filtros?: { estado?: string; busqueda?: string }): Promise<any[]> => {
    const { data } = await api.get('/shipping/admin/all', { params: filtros });
    return data;
  },

  listarMetodosAdmin: async (): Promise<MetodoEnvio[]> => {
    const { data } = await api.get('/shipping/admin/methods');
    return data;
  },

  crearMetodoAdmin: async (datos: Partial<MetodoEnvio>): Promise<MetodoEnvio> => {
    const { data } = await api.post('/shipping/admin/methods', datos);
    return data;
  },

  actualizarMetodoAdmin: async (id: string, datos: Partial<MetodoEnvio>): Promise<MetodoEnvio> => {
    const { data } = await api.put(`/shipping/admin/methods/${id}`, datos);
    return data;
  },

  eliminarMetodoAdmin: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/shipping/admin/methods/${id}`);
    return data;
  },

  // HU-65: Actualizar estado y asignar guía
  actualizarEstadoAdmin: async (id: string, datos: ActualizarEstadoEnvioDto): Promise<TrackingInfo> => {
    const { data } = await api.put(`/shipping/admin/${id}/status`, datos);
    return data;
  },
};
