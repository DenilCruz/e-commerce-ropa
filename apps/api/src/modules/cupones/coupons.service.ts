import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';

import { CouponEntity, TipoCupon } from './entities/coupon.entity';
import { CouponUsageEntity } from './entities/coupon-usage.entity';
import { CrearCuponDto } from './dto/crear-cupon.dto';
import { ActualizarCuponDto } from './dto/actualizar-cupon.dto';
import { AplicarCuponDto } from './dto/aplicar-cupon.dto';

import { TenantContext } from '../../common/tenant/tenant-context';

import { descuentoDeCupon, motivoCuponNoAplicable } from './coupon-rules';
@Injectable()
export class CouponsService {
  private get tid(): string {
    return TenantContext.require();
  }

  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectRepository(CouponEntity)
    private readonly couponRepo: Repository<CouponEntity>,
    @InjectRepository(CouponUsageEntity)
    private readonly couponUsageRepo: Repository<CouponUsageEntity>,
  ) {}

  // =========================================================================
  // HU-71: CREAR CUPÓN (ADMIN)
  // =========================================================================
  async crearCupon(dto: CrearCuponDto) {
    const codigoNormalizado = dto.codigo.trim().toUpperCase();

    // Validar unicidad de código
    const existe = await this.couponRepo.findOne({
      where: {
        tenantId: this.tid,
        codigo: Raw((alias) => `UPPER(${alias}) = :codigo`, {
          codigo: codigoNormalizado,
        }),
      },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe un cupón registrado con el código "${codigoNormalizado}".`,
      );
    }

    // Validar rango de porcentaje si aplica
    if (dto.tipo === TipoCupon.PORCENTAJE && (dto.valor <= 0 || dto.valor > 100)) {
      throw new BadRequestException(
        'Para descuentos porcentuales, el valor debe ser mayor a 0 y menor o igual a 100.',
      );
    }

    // Validar coherencia de fechas (HU-72)
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
      throw new BadRequestException('Las fechas proporcionadas no tienen un formato válido.');
    }

    if (fechaFin <= fechaInicio) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio.');
    }

    const nuevoCupon = this.couponRepo.create({
      codigo: codigoNormalizado,
      descripcion: dto.descripcion,
      tipo: dto.tipo,
      valor: dto.valor,
      montoMinimo: dto.montoMinimo ?? 0,
      usosMaximos: dto.usosMaximos ?? null,
      usosActuales: 0,
      usosPorUsuario: dto.usosPorUsuario ?? 1,
      fechaInicio,
      fechaFin,
      activo: dto.activo !== undefined ? dto.activo : true,
    });

    return await this.couponRepo.save(nuevoCupon);
  }

  // =========================================================================
  // LISTAR CUPONES (ADMIN / PÚBLICO)
  // =========================================================================
  async listarCupones(soloActivos: boolean = false) {
    const query = this.couponRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tid', { tid: this.tid });

    if (soloActivos) {
      const ahora = new Date();
      query
        .andWhere('c.activo = :activo', { activo: true })
        .andWhere('c.fecha_inicio <= :ahora', { ahora })
        .andWhere('c.fecha_fin >= :ahora', { ahora });
    }

    query.orderBy('c.creado_en', 'DESC');
    return await query.getMany();
  }

  // =========================================================================
  // OBTENER CUPÓN POR ID
  // =========================================================================
  async obtenerCuponPorId(id: string) {
    const cupon = await this.couponRepo.findOne({ where: { id, tenantId: this.tid } });
    if (!cupon) {
      throw new NotFoundException(`No se encontró el cupón con ID "${id}".`);
    }
    return cupon;
  }

  // =========================================================================
  // HU-72: ACTUALIZAR CUPÓN (ADMIN)
  // =========================================================================
  async actualizarCupon(id: string, dto: ActualizarCuponDto) {
    const cupon = await this.obtenerCuponPorId(id);

    if (dto.codigo) {
      const codigoNormalizado = dto.codigo.trim().toUpperCase();
      if (codigoNormalizado !== cupon.codigo) {
        const existe = await this.couponRepo.findOne({
          where: {
            tenantId: this.tid,
            codigo: Raw((alias) => `UPPER(${alias}) = :codigo`, {
              codigo: codigoNormalizado,
            }),
          },
        });
        if (existe && existe.id !== id) {
          throw new ConflictException(
            `Ya existe otro cupón registrado con el código "${codigoNormalizado}".`,
          );
        }
        cupon.codigo = codigoNormalizado;
      }
    }

    if (dto.descripcion !== undefined) cupon.descripcion = dto.descripcion;
    if (dto.tipo !== undefined) cupon.tipo = dto.tipo;
    if (dto.valor !== undefined) cupon.valor = dto.valor;
    if (dto.montoMinimo !== undefined) cupon.montoMinimo = dto.montoMinimo;
    if (dto.usosMaximos !== undefined) cupon.usosMaximos = dto.usosMaximos;
    if (dto.usosPorUsuario !== undefined) cupon.usosPorUsuario = dto.usosPorUsuario;
    if (dto.activo !== undefined) cupon.activo = dto.activo;

    if (dto.fechaInicio !== undefined) {
      const fInicio = new Date(dto.fechaInicio);
      if (isNaN(fInicio.getTime())) {
        throw new BadRequestException('Fecha de inicio inválida.');
      }
      cupon.fechaInicio = fInicio;
    }

    if (dto.fechaFin !== undefined) {
      const fFin = new Date(dto.fechaFin);
      if (isNaN(fFin.getTime())) {
        throw new BadRequestException('Fecha de fin inválida.');
      }
      cupon.fechaFin = fFin;
    }

    if (cupon.fechaFin <= cupon.fechaInicio) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio.');
    }

    if (cupon.tipo === TipoCupon.PORCENTAJE && (cupon.valor <= 0 || cupon.valor > 100)) {
      throw new BadRequestException(
        'Para descuentos porcentuales, el valor debe ser mayor a 0 y menor o igual a 100.',
      );
    }

    return await this.couponRepo.save(cupon);
  }

  // =========================================================================
  // HU-75: DESACTIVAR / ACTIVAR CUPÓN (ADMIN)
  // =========================================================================
  async cambiarEstado(id: string, activo: boolean) {
    const cupon = await this.obtenerCuponPorId(id);
    cupon.activo = activo;
    return await this.couponRepo.save(cupon);
  }

  // =========================================================================
  // ELIMINAR CUPÓN (ADMIN)
  // =========================================================================
  async eliminarCupon(id: string) {
    const cupon = await this.obtenerCuponPorId(id);
    await this.couponRepo.remove(cupon);
    return {
      exito: true,
      mensaje: `Cupón "${cupon.codigo}" eliminado satisfactoriamente.`,
    };
  }

  // =========================================================================
  // HU-73 & HU-74: VALIDAR Y APLICAR CUPÓN (CLIENTE / CARRITO)
  // =========================================================================
  async aplicarCupon(dto: AplicarCuponDto, usuarioId?: string) {
    const codigoBuscado = dto.codigo.trim().toUpperCase();

    // 1. Verificar si existe
    const cupon = await this.couponRepo.findOne({
      where: {
        tenantId: this.tid,
        codigo: Raw((alias) => `UPPER(${alias}) = :codigo`, {
          codigo: codigoBuscado,
        }),
      },
    });

    if (!cupon) {
      throw new BadRequestException(`El cupón "${codigoBuscado}" no existe o no es válido.`);
    }

    // 2. Reglas de vigencia, usos y monto mínimo: las mismas que se exigen al cobrar
    const subtotal = Number(dto.subtotal);
    const usosDelUsuario =
      usuarioId && cupon.usosPorUsuario > 0
        ? await this.couponUsageRepo.count({ where: { tenantId: this.tid, cuponId: cupon.id, usuarioId } })
        : 0;
    const motivo = motivoCuponNoAplicable(cupon, subtotal, usosDelUsuario);
    if (motivo) throw new BadRequestException(motivo);
    const montoMinimo = Number(cupon.montoMinimo);
    const valor = Number(cupon.valor);

    // 3. Calcular descuento según tipo
    const descuento = descuentoDeCupon(cupon, subtotal);

    const totalConDescuento = Number((subtotal - descuento).toFixed(2));

    return {
      valido: true,
      cupon: {
        id: cupon.id,
        codigo: cupon.codigo,
        descripcion: cupon.descripcion,
        tipo: cupon.tipo,
        valor: valor,
        montoMinimo: montoMinimo,
      },
      subtotal: Number(subtotal.toFixed(2)),
      descuento: Number(descuento.toFixed(2)),
      totalConDescuento,
      mensaje: `Cupón "${cupon.codigo}" aplicado exitosamente. Descuento: $${descuento.toFixed(2)}`,
    };
  }
}
