import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { StoreEntity } from './entities/store.entity';
import { UserStoreEntity } from './entities/user-store.entity';
import { ProductEntity } from '../productos/entities/product.entity';

export type TipoPlan = 'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO';

export interface PlanConfig {
  id: TipoPlan;
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

export type PeriodoPlan = 'MENSUAL' | 'ANUAL';

export type ClaveCapacidad = 'posOffline' | 'reportesVozNlp' | 'modelosPredictivosMl' | 'soportePrioritario';

/** The 14-day clock applies only to a store whose saved plan is FREE_TRIAL. */
export function pruebaEstaVencida(
  planGuardado: string | null | undefined,
  vence: Date | string | null | undefined,
  ahora: Date = new Date(),
): boolean {
  if (planGuardado !== 'FREE_TRIAL' || !vence) return false;
  const fecha = vence instanceof Date ? vence : new Date(vence);
  return !Number.isNaN(fecha.getTime()) && fecha.getTime() < ahora.getTime();
}

/** Amount in USD for a plan and period. The annual price is a per-month price billed as 12 months at once. */
export function calcularMontoPlan(plan: TipoPlan, periodo: PeriodoPlan): number {
  const config = PLANES_CONFIG[plan];
  if (!config || config.precioMensual <= 0) {
    throw new BadRequestException(`El plan '${plan}' no se vende: elige ESTANDAR o CORPORATIVO.`);
  }
  return periodo === 'ANUAL' ? config.precioAnual * 12 : config.precioMensual;
}

export interface FilaSuscripcion {
  plan: string;
  estado: string;
  /** true while vence_en is still in the future */
  vigente: boolean;
}

/**
 * The plan a store really has today. A store that has never been charged keeps the plan it was created with (it
 * predates billing): opening a checkout that is cancelled, expires or fails does not count, because nothing was
 * ever paid. Once a subscription has been charged, the plan lasts only while a paid, unexpired subscription backs
 * it, and never exceeds the best one still in force.
 */
export function resolverPlanEfectivo(planGuardado: TipoPlan, suscripciones: FilaSuscripcion[]): TipoPlan {
  const alguienPagoAlgunaVez = suscripciones.some((s) => s.estado === 'ACTIVA');
  if (planGuardado === 'FREE_TRIAL' || !alguienPagoAlgunaVez) return planGuardado;

  const pagadosVigentes = suscripciones
    .filter((s) => s.estado === 'ACTIVA' && s.vigente && PLANES_CONFIG[s.plan as TipoPlan])
    .map((s) => s.plan as TipoPlan);
  if (pagadosVigentes.length === 0) return 'FREE_TRIAL';

  const mejor = pagadosVigentes.reduce((a, b) => (PLANES_CONFIG[b].precioMensual > PLANES_CONFIG[a].precioMensual ? b : a));
  return PLANES_CONFIG[planGuardado].precioMensual <= PLANES_CONFIG[mejor].precioMensual ? planGuardado : mejor;
}

export const PLANES_CONFIG: Record<TipoPlan, PlanConfig> = {
  FREE_TRIAL: {
    id: 'FREE_TRIAL',
    nombre: 'Free Trial (Prueba)',
    descripcion: 'Ideal para validar tu idea de tienda online sin costo durante 14 días.',
    precioMensual: 0,
    precioAnual: 0,
    maxSucursales: 1,
    maxUsuarios: 2,
    maxProductos: 30,
    posOffline: false,
    reportesVozNlp: false,
    modelosPredictivosMl: false,
    soportePrioritario: false,
  },
  ESTANDAR: {
    id: 'ESTANDAR',
    nombre: 'Plan Estándar (Crecimiento)',
    descripcion: 'Para marcas consolidadas con ventas físicas y online en constante expansión.',
    precioMensual: 20,
    precioAnual: 16,
    maxSucursales: 3,
    maxUsuarios: 10,
    maxProductos: 300,
    posOffline: true,
    reportesVozNlp: true,
    modelosPredictivosMl: false,
    soportePrioritario: false,
    destacado: true,
  },
  CORPORATIVO: {
    id: 'CORPORATIVO',
    nombre: 'Plan Corporativo (Enterprise)',
    descripcion: 'Infraestructura sin límites con analítica predictiva avanzada e IA.',
    precioMensual: 100,
    precioAnual: 80,
    maxSucursales: 99,
    maxUsuarios: 999,
    maxProductos: 10000,
    posOffline: true,
    reportesVozNlp: true,
    modelosPredictivosMl: true,
    soportePrioritario: true,
  },
};

@Injectable()
export class PlanLimitsService {
  constructor(
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    @InjectRepository(UserStoreEntity)
    private readonly membershipRepo: Repository<UserStoreEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
  ) {}

  /**
   * Retorna el catálogo estático con todos los planes disponibles y sus características.
   */
  obtenerCatalogoPlanes(): PlanConfig[] {
    return Object.values(PLANES_CONFIG);
  }

  /**
   * Obtiene la configuración de un plan específico o el de prueba por defecto.
   */
  obtenerConfiguracionPlan(planKey?: string): PlanConfig {
    const key = (planKey?.toUpperCase() || 'FREE_TRIAL') as TipoPlan;
    return PLANES_CONFIG[key] || PLANES_CONFIG.FREE_TRIAL;
  }

  /**
   * Consulta el plan de la tienda, su consumo actual y el estado de sus límites.
   */
  /** The plan a store has right now (subscription expiry included), for callers that sell plans. */
  async obtenerPlanEfectivo(tiendaId: string): Promise<TipoPlan> {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) throw new NotFoundException('La tienda especificada no existe.');
    return this.planEfectivo(tienda);
  }

  /** The plan the store has right now, taking subscription expiry into account. */
  private async planEfectivo(tienda: StoreEntity): Promise<TipoPlan> {
    const guardado = (PLANES_CONFIG[tienda.plan as TipoPlan] ? tienda.plan : 'FREE_TRIAL') as TipoPlan;
    if (guardado === 'FREE_TRIAL') return guardado;
    try {
      const filas: FilaSuscripcion[] = await this.storeRepo.manager.query(
        'SELECT plan, estado, (vence_en IS NOT NULL AND vence_en > now()) AS vigente FROM suscripcion WHERE tenant_id = $1',
        [tienda.id],
      );
      return resolverPlanEfectivo(guardado, filas);
    } catch (error: any) {
      // 42P01: the subscriptions table is not there yet (database not migrated); keep the stored plan
      if (error?.code === '42P01') return guardado;
      throw error;
    }
  }

  async obtenerMetricasYLimites(tiendaId: string) {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) {
      throw new NotFoundException('La tienda especificada no existe.');
    }

    const planActual = await this.planEfectivo(tienda);
    const config = this.obtenerConfiguracionPlan(planActual);
    const pruebaVencida = pruebaEstaVencida(tienda.plan, tienda.pruebaVenceEn);
    const totalSucursales = await this.contarSucursales(tiendaId);

    // Conteo de usuarios/empleados miembros de la tienda
    const totalUsuarios = await this.contarPersonal(tiendaId);

    // Conteo de productos creados bajo este tenant
    const totalProductos = await this.productRepo.count({
      where: { tenantId: tiendaId },
    });

    return {
      tienda: {
        id: tienda.id,
        nombre: tienda.nombre,
        slug: tienda.slug,
        plan: planActual,
        propietarioId: tienda.propietarioId,
      },
      plan: config,
      consumo: {
        usuarios: {
          actual: totalUsuarios,
          limite: config.maxUsuarios,
          superado: totalUsuarios >= config.maxUsuarios,
          porcentaje: Math.min(100, Math.round((totalUsuarios / config.maxUsuarios) * 100)),
        },
        productos: {
          actual: totalProductos,
          limite: config.maxProductos,
          superado: totalProductos >= config.maxProductos,
          porcentaje: Math.min(100, Math.round((totalProductos / config.maxProductos) * 100)),
        },
        sucursales: {
          actual: totalSucursales,
          limite: config.maxSucursales,
          superado: totalSucursales >= config.maxSucursales,
          porcentaje: Math.min(100, Math.round((totalSucursales / config.maxSucursales) * 100)),
        },
      },
      pruebaVencida,
      pruebaVenceEn: tienda.pruebaVenceEn ? new Date(tienda.pruebaVenceEn).toISOString() : null,
      capacidades: pruebaVencida
        ? { posOffline: false, reportesVozNlp: false, modelosPredictivosMl: false, soportePrioritario: false }
        : {
            posOffline: config.posOffline,
            reportesVozNlp: config.reportesVozNlp,
            modelosPredictivosMl: config.modelosPredictivosMl,
            soportePrioritario: config.soportePrioritario,
          },
    };
  }

  /** Staff seats only: shoppers (CLIENTE) never consume the plan's user quota. */
  private contarPersonal(tiendaId: string): Promise<number> {
    return this.membershipRepo.count({
      where: { tiendaId, activo: true, rol: { nombre: Not('CLIENTE') } },
    });
  }

  /** Active branches. A database without the table yet counts as the single default branch. */
  private async contarSucursales(tiendaId: string): Promise<number> {
    try {
      const filas: { total?: number | string }[] = await this.storeRepo.manager.query(
        'SELECT COUNT(*)::int AS total FROM sucursal WHERE tenant_id = $1 AND activa = true',
        [tiendaId],
      );
      const total = Number(filas?.[0]?.total);
      return Number.isFinite(total) ? total : 0;
    } catch (error: any) {
      if (error?.code === '42P01') return 1;
      throw error;
    }
  }

  async listarSucursales(tiendaId: string) {
    try {
      return await this.storeRepo.manager.query(
        `SELECT id, nombre, direccion, activa FROM sucursal
         WHERE tenant_id = $1 AND activa = true ORDER BY creado_en ASC`,
        [tiendaId],
      );
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      throw error;
    }
  }

  async crearSucursal(tiendaId: string, nombre: string, direccion?: string) {
    const limpio = nombre?.trim();
    if (!limpio) throw new BadRequestException('La sucursal necesita un nombre.');
    await this.validarLimiteSucursales(tiendaId);
    const filas = await this.storeRepo.manager.query(
      `INSERT INTO sucursal (tenant_id, nombre, direccion, activa)
       VALUES ($1, $2, $3, true)
       RETURNING id, nombre, direccion, activa`,
      [tiendaId, limpio, direccion?.trim() || null],
    );
    return filas[0];
  }

  /**
   * Valida si la tienda puede crear un nuevo producto según su plan.
   * Lanza ForbiddenException (HTTP 403) si se excedió la cuota.
   */
  async validarLimiteProductos(tiendaId: string): Promise<void> {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) return;
    this.exigirPruebaVigente(tienda);

    const config = this.obtenerConfiguracionPlan(await this.planEfectivo(tienda));
    const totalProductos = await this.productRepo.count({
      where: { tenantId: tiendaId },
    });

    if (totalProductos >= config.maxProductos) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${config.maxProductos} productos de tu plan ${config.nombre}. ` +
          'Actualiza a un plan superior para seguir publicando nuevos productos.',
      );
    }
  }

  /**
   * Valida si la tienda puede añadir un nuevo miembro/usuario.
   * Lanza ForbiddenException (HTTP 403) si se excedió la cuota.
   */
  async validarLimiteUsuarios(tiendaId: string): Promise<void> {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) return;
    this.exigirPruebaVigente(tienda);

    const config = this.obtenerConfiguracionPlan(await this.planEfectivo(tienda));
    const totalUsuarios = await this.contarPersonal(tiendaId);

    if (totalUsuarios >= config.maxUsuarios) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${config.maxUsuarios} usuarios de tu plan ${config.nombre}. ` +
          'Actualiza al Plan Estándar o Corporativo para añadir más integrantes a tu equipo.',
      );
    }
  }

  async validarLimiteSucursales(tiendaId: string): Promise<void> {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) return;
    this.exigirPruebaVigente(tienda);

    const config = this.obtenerConfiguracionPlan(await this.planEfectivo(tienda));
    const total = await this.contarSucursales(tiendaId);
    if (total >= config.maxSucursales) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${config.maxSucursales} sucursales de tu plan ${config.nombre}. ` +
          'Actualiza a un plan superior para abrir otra sucursal.',
      );
    }
  }

  /** 403 when the effective plan does not include the capability (trial flags included). */
  async exigirCapacidad(tiendaId: string, clave: ClaveCapacidad): Promise<void> {
    const metricas = await this.obtenerMetricasYLimites(tiendaId);
    if (metricas.capacidades[clave]) return;
    const motivo = metricas.pruebaVencida
      ? 'Tu prueba de 14 días terminó.'
      : `Tu plan ${metricas.plan.nombre} no incluye esta función.`;
    throw new ForbiddenException(`${motivo} Elige un plan que la incluya.`);
  }

  private exigirPruebaVigente(tienda: StoreEntity): void {
    if (!pruebaEstaVencida(tienda.plan, tienda.pruebaVenceEn)) return;
    throw new ForbiddenException(
      'Tu prueba de 14 días terminó. Elige un plan para seguir creando productos, usuarios o sucursales.',
    );
  }

  private async esOperadorPlataforma(usuarioId: string): Promise<boolean> {
    try {
      const filas: { nombre?: string }[] = await this.storeRepo.manager.query(
        'SELECT r.nombre AS nombre FROM usuario u JOIN rol r ON r.id = u.rol_id WHERE u.id = $1',
        [usuarioId],
      );
      return filas?.[0]?.nombre === 'SUPERADMIN';
    } catch (error: any) {
      if (error?.code === '42P01') return false;
      throw error;
    }
  }

  /** Returns the store when the user is its owner or an ADMIN; 404 if it does not exist, 403 otherwise. */
  async verificarAdministradorDeTienda(tiendaId: string, usuarioId: string): Promise<StoreEntity> {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) {
      throw new NotFoundException('La tienda especificada no existe.');
    }

    const membresia = await this.membershipRepo.findOne({
      where: { tiendaId, usuarioId, activo: true },
      relations: ['rol'],
    });

    const esPropietario = tienda.propietarioId === usuarioId;
    const esAdmin = membresia?.rol?.nombre === 'ADMIN';
    if (!esPropietario && !esAdmin && !(await this.esOperadorPlataforma(usuarioId))) {
      throw new ForbiddenException('Solo el propietario o administrador de la tienda puede administrar su plan.');
    }
    return tienda;
  }

  /**
   * Baja el plan de la tienda (Downgrade). Subirlo requiere pagar: responde 402.
   * Solo el propietario o un ADMIN de la tienda puede realizar esta acción.
   */
  async cambiarPlan(tiendaId: string, nuevoPlan: string, usuarioId: string) {
    const planKey = nuevoPlan?.toUpperCase() as TipoPlan;
    if (!PLANES_CONFIG[planKey]) {
      throw new BadRequestException(
        `El plan '${nuevoPlan}' no es válido. Opciones permitidas: FREE_TRIAL, ESTANDAR, CORPORATIVO.`,
      );
    }

    const tienda = await this.verificarAdministradorDeTienda(tiendaId, usuarioId);

    // Subir de plan se paga: solo el webhook de Stripe lo concede (ver BillingService). Bajar es libre.
    const planVigente = PLANES_CONFIG[await this.planEfectivo(tienda)];
    if (PLANES_CONFIG[planKey].precioMensual > planVigente.precioMensual) {
      throw new HttpException(
        `Para pasar al plan ${PLANES_CONFIG[planKey].nombre} debes completar el pago desde el checkout de planes.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    tienda.plan = planKey;
    await this.storeRepo.save(tienda);

    return this.obtenerMetricasYLimites(tiendaId);
  }
}
