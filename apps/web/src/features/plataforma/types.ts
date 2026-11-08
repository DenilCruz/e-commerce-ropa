export type PlanId = 'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO';
export type EstadoTienda = 'ACTIVA' | 'SUSPENDIDA';
export type EstadoSuscripcion = 'PENDIENTE_PAGO' | 'ACTIVA' | 'FALLIDA' | 'EXPIRADA';

export interface ResumenPlataforma {
  tiendasTotal: number;
  porEstado: Partial<Record<EstadoTienda, number>>;
  porPlan: Partial<Record<PlanId, number>>;
  nuevas30d: number;
  mrrUsd: number;
  ingresosMesUsd: number;
  suscripcionesVigentes: number;
}

export interface TiendaPlataforma {
  id: string;
  nombre: string;
  slug: string;
  plan: PlanId;
  estado: EstadoTienda;
  propietarioCorreo: string | null;
  usuarios: number;
  productos: number;
  pedidos: number;
  venceEn: string | null;
  creadoEn: string;
  esBase: boolean;
}

export interface SuscripcionPlataforma {
  id: string;
  tiendaId: string;
  tiendaNombre: string;
  plan: PlanId;
  periodo: 'MENSUAL' | 'ANUAL';
  monto: number;
  moneda: string;
  estado: EstadoSuscripcion;
  inicioEn: string | null;
  venceEn: string | null;
  creadoEn: string;
}

export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface FiltrosTiendas {
  busqueda?: string;
  plan?: PlanId | '';
  estado?: EstadoTienda | '';
  pagina?: number;
  limite?: number;
}

export interface FiltrosSuscripciones {
  estado?: EstadoSuscripcion | '';
  pagina?: number;
  limite?: number;
}
