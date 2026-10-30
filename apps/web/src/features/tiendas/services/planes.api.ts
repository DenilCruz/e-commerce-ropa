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
  capacidades: {
    posOffline: boolean;
    reportesVozNlp: boolean;
    modelosPredictivosMl: boolean;
    soportePrioritario: boolean;
  };
}

export type PlanComprable = 'ESTANDAR' | 'CORPORATIVO';
export type PeriodoPlan = 'MENSUAL' | 'ANUAL';

export interface CheckoutPlanResponse {
  url: string;
  sesionId: string;
  suscripcionId: string;
  monto: number;
  moneda: string;
}

export interface EstadoCompraPlan {
  estado: 'PENDIENTE_PAGO' | 'ACTIVA' | 'FALLIDA' | 'EXPIRADA';
  plan: string;
  periodo: PeriodoPlan;
  monto: number;
  moneda: string;
  venceEn: string | null;
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
};
