import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
  ) {}

  // =========================================================================
  // HU-57: HISTORIAL DE PEDIDOS DEL CLIENTE
  // =========================================================================
  async obtenerMisPedidos(usuarioId: string) {
    const ordenes = await this.orderRepo.find({
      where: { usuarioId },
      relations: [
        'pago',
        'pago.metodoPago',
        'items',
        'items.producto',
        'items.producto.imagenes',
        'items.variante',
        'items.variante.talla',
        'items.variante.color',
        'cupon',
      ],
      order: { creadoEn: 'DESC' },
    });

    return ordenes.map((o) => this.formatearOrden(o));
  }

  // =========================================================================
  // DETALLE DE PEDIDO
  // =========================================================================
  async obtenerDetalle(id: string, usuarioId?: string, userRole?: string) {
    const orden = await this.orderRepo.findOne({
      where: { id },
      relations: [
        'pago',
        'pago.metodoPago',
        'items',
        'items.producto',
        'items.producto.imagenes',
        'items.variante',
        'items.variante.talla',
        'items.variante.color',
        'usuario',
        'cupon',
      ],
    });

    if (!orden) {
      throw new NotFoundException(`La orden con ID ${id} no existe.`);
    }

    const isAdmin = userRole?.toUpperCase() === 'ADMIN' || userRole?.toUpperCase() === 'SUPERADMIN';
    if (!isAdmin && usuarioId && orden.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tienes permiso para ver esta orden.');
    }

    return this.formatearOrden(orden);
  }

  // =========================================================================
  // LISTAR TODOS LOS PEDIDOS (ADMIN)
  // =========================================================================
  async obtenerTodosAdmin(filtros?: {
    estado?: string;
    busqueda?: string;
    fechaInicio?: string;
    fechaFin?: string;
  }) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.usuario', 'u')
      .leftJoinAndSelect('o.pago', 'p')
      .leftJoinAndSelect('p.metodoPago', 'mp')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('items.producto', 'prod')
      .leftJoinAndSelect('items.variante', 'v')
      .leftJoinAndSelect('v.talla', 'talla')
      .leftJoinAndSelect('v.color', 'color')
      .leftJoinAndSelect('o.cupon', 'cupon')
      .orderBy('o.creadoEn', 'DESC');

    if (filtros?.estado && filtros.estado !== 'TODOS') {
      qb.andWhere('o.estado = :estado', { estado: filtros.estado.toUpperCase() });
    }

    if (filtros?.busqueda) {
      qb.andWhere(
        '(o.nro ILIKE :busq OR u.nombre ILIKE :busq OR u.apellido ILIKE :busq OR u.correo ILIKE :busq)',
        { busq: `%${filtros.busqueda}%` },
      );
    }

    if (filtros?.fechaInicio) {
      qb.andWhere('o.creadoEn >= :fechaInicio', { fechaInicio: filtros.fechaInicio });
    }

    if (filtros?.fechaFin) {
      qb.andWhere('o.creadoEn <= :fechaFin', { fechaFin: `${filtros.fechaFin} 23:59:59` });
    }

    const ordenes = await qb.getMany();
    return ordenes.map((o) => this.formatearOrden(o));
  }

  // =========================================================================
  // ACTUALIZAR ESTADO DE PEDIDO (ADMIN)
  // =========================================================================
  async actualizarEstadoAdmin(id: string, nuevoEstado: string) {
    const orden = await this.orderRepo.findOne({
      where: { id },
      relations: ['pago'],
    });

    if (!orden) {
      throw new NotFoundException(`Orden ${id} no encontrada.`);
    }

    const estadosValidos = ['PENDIENTE', 'PAGADO', 'COMPLETADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO', 'REEMBOLSADO'];
    if (!estadosValidos.includes(nuevoEstado.toUpperCase())) {
      throw new BadRequestException(`Estado no válido. Valores permitidos: ${estadosValidos.join(', ')}`);
    }

    orden.estado = nuevoEstado.toUpperCase();
    await this.orderRepo.save(orden);

    return this.obtenerDetalle(id);
  }

  // =========================================================================
  // HELPER FORMAT
  // =========================================================================
  private formatearOrden(orden: OrderEntity) {
    return {
      id: orden.id,
      nro: orden.nro,
      fecha: orden.fecha || orden.creadoEn,
      estado: orden.estado,
      subtotal: Number(orden.subtotal),
      descuento: Number(orden.descuento),
      costoEnvio: Number(orden.costoEnvio),
      total: Number(orden.total),
      cupon: orden.cupon
        ? {
            id: orden.cupon.id,
            codigo: orden.cupon.codigo,
            tipo: orden.cupon.tipo,
            valor: Number(orden.cupon.valor),
          }
        : null,
      pago: orden.pago
        ? {
            id: orden.pago.id,
            monto: Number(orden.pago.monto),
            estado: orden.pago.estado,
            idTransaccion: orden.pago.idTransaccion,
            metodoPago:
              orden.pago.metodoPago?.nombre ||
              (orden.pago.idTransaccion?.startsWith('COD')
                ? 'Efectivo contra entrega'
                : 'Tarjeta de Débito/Crédito'),
            fechaPago: orden.pago.fechaPago || orden.pago.creadoEn,
            respuestaPasarela: orden.pago.respuestaPasarela,
          }
        : null,
      items: (orden.items || []).map((item) => ({
        id: item.id,
        productoId: item.productoId,
        nombre: item.nombreProducto || item.producto?.nombre || 'Prenda',
        talla: item.talla || item.variante?.talla?.nombre || 'Única',
        color: item.color || item.variante?.color?.nombre || 'Original',
        cantidad: item.cantidad,
        precio: Number(item.precio),
        subtotal: Number(item.subtotal),
        imagen: item.producto?.imagenes?.[0]?.url || null,
      })),
      usuario: orden.usuario
        ? {
            id: orden.usuario.id,
            nombre: `${orden.usuario.nombre} ${orden.usuario.apellido}`,
            correo: orden.usuario.correo,
            celular: orden.usuario.celular,
          }
        : undefined,
    };
  }
}
