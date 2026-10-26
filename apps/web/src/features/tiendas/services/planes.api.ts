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
  obtenerConsumoYLimites: async (): Promise<MetricasyLimitesResponse> => {
    const res = await api.get('/auth/tiendas/plan-limites');
    return res.data;
  },

  /**
   * Cambia o actualiza el plan de la tienda activa (Upgrade/Downgrade).
   */
  cambiarPlan: async (plan: 'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO'): Promise<MetricasyLimitesResponse> => {
    const res = await api.patch('/auth/tiendas/cambiar-plan', { plan });
    return res.data;
  },
};
