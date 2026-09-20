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

@Injectable()
export class CouponsService {
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
    const query = this.couponRepo.createQueryBuilder('c');

    if (soloActivos) {
      const ahora = new Date();
      query
        .where('c.activo = :activo', { activo: true })
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
    const cupon = await this.couponRepo.findOne({ where: { id } });
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
        codigo: Raw((alias) => `UPPER(${alias}) = :codigo`, {
          codigo: codigoBuscado,
        }),
      },
    });

    if (!cupon) {
      throw new BadRequestException(`El cupón "${codigoBuscado}" no existe o no es válido.`);
    }

    // 2. Verificar si está activo (HU-75)
    if (!cupon.activo) {
      throw new BadRequestException(`El cupón "${cupon.codigo}" está actualmente desactivado.`);
    }

    // 3. Validar rango de fechas (HU-72 / HU-74)
    const ahora = new Date();
    const fechaInicio = new Date(cupon.fechaInicio);
    const fechaFin = new Date(cupon.fechaFin);

    if (ahora < fechaInicio) {
      throw new BadRequestException(
        `El cupón "${cupon.codigo}" aún no está vigente. Estará disponible a partir del ${fechaInicio.toLocaleDateString()}.`,
      );
    }

    if (ahora > fechaFin) {
      throw new BadRequestException(
        `El cupón "${cupon.codigo}" ha expirado el ${fechaFin.toLocaleDateString()}.`,
      );
    }

    // 4. Validar usos máximos globales (HU-72 / HU-74)
    if (cupon.usosMaximos !== null && cupon.usosActuales >= cupon.usosMaximos) {
      throw new BadRequestException(
        `El cupón "${cupon.codigo}" ha alcanzado el límite máximo de usos permitidos.`,
      );
    }

    // 5. Validar monto mínimo de compra (HU-72 / HU-74)
    const subtotal = Number(dto.subtotal);
    const montoMinimo = Number(cupon.montoMinimo);

    if (subtotal < montoMinimo) {
      throw new BadRequestException(
        `El subtotal de la compra (Bs. ${subtotal.toFixed(2)}) no alcanza el monto mínimo requerido de Bs. ${montoMinimo.toFixed(2)} para aplicar el cupón "${cupon.codigo}".`,
      );
    }

    // 6. Validar usos por usuario (si está autenticado) (HU-72 / HU-74)
    if (usuarioId && cupon.usosPorUsuario > 0) {
      const usosDelUsuario = await this.couponUsageRepo.count({
        where: {
          cuponId: cupon.id,
          usuarioId: usuarioId,
        },
      });

      if (usosDelUsuario >= cupon.usosPorUsuario) {
        throw new BadRequestException(
          `Ya has utilizado este cupón ${usosDelUsuario} vez/veces. El límite permitido por usuario es ${cupon.usosPorUsuario}.`,
        );
      }
    }

    // 7. Calcular descuento según tipo (HU-71 / HU-73)
    let descuento = 0;
    const valor = Number(cupon.valor);

    if (cupon.tipo === TipoCupon.PORCENTAJE) {
      descuento = Number(((subtotal * valor) / 100).toFixed(2));
    } else {
      // MONTO_FIJO
      descuento = Math.min(valor, subtotal);
    }

    // Asegurar que el descuento nunca supere el subtotal
    if (descuento > subtotal) {
      descuento = subtotal;
    }

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
      mensaje: `Cupón "${cupon.codigo}" aplicado exitosamente. Descuento: Bs. ${descuento.toFixed(2)}`,
    };
  }
}
