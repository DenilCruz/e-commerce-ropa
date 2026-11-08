import { api } from '../../../services/api';

export interface PlanConfig {
  id: 'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO';
  nombre: string;
  descripcion: string;
  precioMensual: number;
  precioAnual: number;
  maxSucursales: number;
  maxUsuarios: number;
  maxProductos: number;
  posOffline: boolean;
  reportesVozNlp: boolean;
  modelosPredictivosMl: boolean;
  soportePrioritario: boolean;
  destacado?: boolean;
}

export interface ConsumoDetalle {
  actual: number;
  limite: number;
  superado: boolean;
  porcentaje: number;
}

export interface MetricasYLimitesResponse {
  tienda: {
    id: string;
    nombre: string;
    slug: string;
    plan: string;
    propietarioId: string | null;
  };
  plan: PlanConfig;
  consumo: {
    usuarios: ConsumoDetalle;
    productos: ConsumoDetalle;
    sucursales: ConsumoDetalle;
  };
  /** Days the store keeps data not synced yet on its devices (C3, 1..30). */
  retencionOfflineDias?: number;
  pruebaVencida?: boolean;
  pruebaVenceEn?: string | null;
  capacidades: {
    posOffline: boolean;
    reportesVozNlp: boolean;
    modelosPredictivosMl: boolean;
    soportePrioritario: boolean;
  };
}

export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
  activa: boolean;
}

export type PlanComprable = 'ESTANDAR' | 'CORPORATIVO';
export type PeriodoPlan = 'MENSUAL' | 'ANUAL';

export interface CheckoutPlanResponse {
  url: string;
  sesionId: string;
  suscripcionId: string;
  monto: number;
  moneda: string;
  /** true when the payment page is the app's own simulated gateway instead of Stripe */
  simulado: boolean;
}

export interface AltaTiendaResponse {
  url: string;
  sesionId: string;
  altaId: string;
  monto: number;
  moneda: string;
  simulado: boolean;
}

export interface EstadoCompraPlan {
  /** ALTA_TIENDA: a store that is created when the payment is approved; PLAN: a plan for a store that exists */
  tipo?: 'ALTA_TIENDA' | 'PLAN';
  estado: 'PENDIENTE_PAGO' | 'ACTIVA' | 'FALLIDA' | 'EXPIRADA';
  plan: string;
  periodo: PeriodoPlan;
  monto: number;
  moneda: string;
  venceEn: string | null;
  nombreTienda?: string | null;
  tienda?: { id: string; slug: string; nombre: string } | null;
}

export type MetodoPagoSimulado = 'TARJETA' | 'QR';

export interface PagoSimuladoRequest {
  sessionId: string;
  metodo: MetodoPagoSimulado;
  numero?: string;
  expiracion?: string;
  cvc?: string;
  titular?: string;
}

export interface MiSuscripcion {
  /** true when plan payments run on the simulated gateway */
  simulado: boolean;
  suscripcion: {
    plan: string;
    periodo: PeriodoPlan;
    monto: number;
    moneda: string;
    venceEn: string;
    cancelarAlVencer: boolean;
    ultimoCobroFallidoEn: string | null;
  } | null;
}

export interface ConfigOffline {
  retencionOfflineDias: number;
}

export const planesApi = {
  /**
   * Obtiene el catálogo público de los 3 planes de suscripción.
   */
  obtenerCatalogo: async (): Promise<PlanConfig[]> => {
    const res = await api.get('/auth/tiendas/catalogo-planes');
    return res.data;
  },

  /**
   * Consulta el consumo actual y límites de la tienda activa.
   */
  obtenerConsumoYLimites: async (): Promise<MetricasYLimitesResponse> => {
    const res = await api.get('/auth/tiendas/plan-limites');
    return res.data;
  },

  /** Owner only: days the devices of this store keep unsynced data (1..30). */
  actualizarConfigOffline: async (retencionOfflineDias: number): Promise<ConfigOffline> => {
    const res = await api.patch('/auth/tiendas/mi-config-offline', { retencionOfflineDias });
    return res.data;
  },

  listarSucursales: async (): Promise<Sucursal[]> => {
    const res = await api.get('/auth/tiendas/sucursales');
    return res.data;
  },

  crearSucursal: async (nombre: string, direccion?: string): Promise<Sucursal> => {
    const res = await api.post('/auth/tiendas/sucursales', { nombre, direccion });
    return res.data;
  },

  /**
   * Cambia o actualiza el plan de la tienda activa (Upgrade/Downgrade).
   */
  cambiarPlan: async (plan: 'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO'): Promise<MetricasYLimitesResponse> => {
    const res = await api.patch('/auth/tiendas/cambiar-plan', { plan });
    return res.data;
  },

  /**
   * Abre el pago de un plan en Stripe. El plan no cambia aquí: se activa cuando Stripe confirma el pago.
   */
  crearCheckout: async (plan: PlanComprable, periodo: PeriodoPlan): Promise<CheckoutPlanResponse> => {
    const res = await api.post('/planes/checkout', { plan, periodo });
    return res.data;
  },

  /**
   * Estado de una compra de plan; la pantalla de retorno lo consulta hasta que el webhook la activa.
   */
  obtenerEstadoCompra: async (sesionId: string): Promise<EstadoCompraPlan> => {
    const res = await api.get('/planes/estado', { params: { session_id: sesionId } });
    return res.data;
  },

  /**
   * Starts a paid plan for someone who has no store yet. The store is created when the payment is approved, not before.
   */
  crearAltaTienda: async (nombre: string, plan: PlanComprable, periodo: PeriodoPlan): Promise<AltaTiendaResponse> => {
    const res = await api.post('/planes/alta-tienda', { nombre, plan, periodo });
    return res.data;
  },

  /** Pays on the simulated gateway. A decline answers 402 with the reason. */
  pagarSimulado: async (pago: PagoSimuladoRequest): Promise<EstadoCompraPlan> => {
    const res = await api.post('/planes/pago-simulado', pago);
    return res.data;
  },

  obtenerMiSuscripcion: async (): Promise<MiSuscripcion> => {
    const res = await api.get('/planes/mi-suscripcion');
    return res.data;
  },

  cancelarRenovacion: async (): Promise<MiSuscripcion> => {
    const res = await api.post('/planes/cancelar');
    return res.data;
  },

  reanudarRenovacion: async (): Promise<MiSuscripcion> => {
    const res = await api.post('/planes/reanudar');
    return res.data;
  },

  /** Demo helper of the simulated gateway: the next period's charge goes through or fails. */
  simularCobro: async (resultado: 'EXITOSO' | 'FALLIDO'): Promise<MiSuscripcion> => {
    const res = await api.post(resultado === 'EXITOSO' ? '/planes/simulacion/renovar' : '/planes/simulacion/cobro-fallido');
    return res.data;
  },
};
