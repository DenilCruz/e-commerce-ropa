import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    precioMensual: 199,
    precioAnual: 159,
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
    precioMensual: 499,
    precioAnual: 399,
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
  async obtenerMetricasYLimites(tiendaId: string) {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) {
      throw new NotFoundException('La tienda especificada no existe.');
    }

    const config = this.obtenerConfiguracionPlan(tienda.plan);

    // Conteo de usuarios/empleados miembros de la tienda
    const totalUsuarios = await this.membershipRepo.count({
      where: { tiendaId, activo: true },
    });

    // Conteo de productos creados bajo este tenant
    const totalProductos = await this.productRepo.count({
      where: { tenantId: tiendaId },
    });

    return {
      tienda: {
        id: tienda.id,
        nombre: tienda.nombre,
        slug: tienda.slug,
        plan: tienda.plan,
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
          actual: 1,
          limite: config.maxSucursales,
          superado: false,
          porcentaje: Math.min(100, Math.round((1 / config.maxSucursales) * 100)),
        },
      },
      capacidades: {
        posOffline: config.posOffline,
        reportesVozNlp: config.reportesVozNlp,
        modelosPredictivosMl: config.modelosPredictivosMl,
        soportePrioritario: config.soportePrioritario,
      },
    };
  }

  /**
   * Valida si la tienda puede crear un nuevo producto según su plan.
   * Lanza ForbiddenException (HTTP 403) si se excedió la cuota.
   */
  async validarLimiteProductos(tiendaId: string): Promise<void> {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) return;

    const config = this.obtenerConfiguracionPlan(tienda.plan);
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

    const config = this.obtenerConfiguracionPlan(tienda.plan);
    const totalUsuarios = await this.membershipRepo.count({
      where: { tiendaId, activo: true },
    });

    if (totalUsuarios >= config.maxUsuarios) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${config.maxUsuarios} usuarios de tu plan ${config.nombre}. ` +
          'Actualiza al Plan Estándar o Corporativo para añadir más integrantes a tu equipo.',
      );
    }
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

    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) {
      throw new NotFoundException('La tienda especificada no existe.');
    }

    // Verificar que el solicitante sea miembro con rol ADMIN o propietario
    const membresia = await this.membershipRepo.findOne({
      where: { tiendaId, usuarioId, activo: true },
      relations: ['rol'],
    });

    const esPropietario = tienda.propietarioId === usuarioId;
    const esAdmin = membresia?.rol?.nombre === 'ADMIN';

    if (!esPropietario && !esAdmin) {
      throw new ForbiddenException('Solo el propietario o administrador de la tienda puede cambiar el plan.');
    }

    // Subir de plan se paga: solo el webhook de Stripe lo concede (ver BillingService). Bajar es libre.
    const planActual = PLANES_CONFIG[tienda.plan as TipoPlan] ?? PLANES_CONFIG.FREE_TRIAL;
    if (PLANES_CONFIG[planKey].precioMensual > planActual.precioMensual) {
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
