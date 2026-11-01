import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';

import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderHistoryEntity } from './entities/order-history.entity';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { ShippingEntity } from '../envios/entities/shipping.entity';
import { PaymentEntity } from '../pagos/entities/payment.entity';

import { TenantContext } from '../../common/tenant/tenant-context';

import { tipoDePago } from '../pagos/payment-kinds';
import { ContextoPago, ESTADOS_ORDEN, efectosDeTransicion, motivoTransicionInvalida } from './order-transitions';
@Injectable()
export class OrdersService {
  private get tid(): string {
    return TenantContext.require();
  }

  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(OrderHistoryEntity)
    private readonly orderHistoryRepo: Repository<OrderHistoryEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepo: Repository<ProductVariantEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // HU-49: HISTORIAL DE PEDIDOS DEL CLIENTE
  // =========================================================================
  async obtenerMisPedidos(usuarioId: string) {
    const ordenes = await this.orderRepo.find({
      where: { usuarioId, tenantId: this.tid },
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
        'envio',
        'envio.metodoEnvio',
        'historial',
      ],
      order: { creadoEn: 'DESC' },
    });

    return ordenes.map((o) => this.formatearOrden(o));
  }

  // =========================================================================
  // HU-50: DETALLE DE PEDIDO
  // =========================================================================
  async obtenerDetalle(id: string, usuarioId?: string, userRole?: string) {
    const orden = await this.orderRepo.findOne({
      where: { id, tenantId: this.tid },
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
        'envio',
        'envio.metodoEnvio',
        'historial',
        'historial.usuario',
      ],
      order: {
        historial: { creadoEn: 'ASC' },
      },
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
  // HU-51: CANCELAR PEDIDO SI AÚN NO FUE ENVIADO (CLIENTE)
  // =========================================================================
  async cancelarPedidoCliente(usuarioId: string, id: string, motivo?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orden = await this.cargarOrdenBloqueada(queryRunner.manager, id);

      if (orden.usuarioId !== usuarioId) {
        throw new ForbiddenException('No tienes permiso para cancelar esta orden.');
      }
      if (orden.estado === 'CANCELADO') {
        throw new BadRequestException('Esta orden ya se encuentra cancelada.');
      }
      // The customer can only cancel what the store has not yet dispatched.
      if (orden.estado !== 'PENDIENTE' && orden.estado !== 'PAGADO') {
        throw new BadRequestException('No se puede cancelar el pedido porque ya fue despachado, entregado o cerrado.');
      }
      if (orden.envio && ['EN_CAMINO', 'EN_REPARTO', 'ENTREGADO'].includes(orden.envio.estado)) {
        throw new BadRequestException('El paquete ya está en tránsito con la transportadora y no puede cancelarse.');
      }

      const estadoAnterior = orden.estado;
      await this.aplicarCambioDeEstado(queryRunner.manager, orden, 'CANCELADO', {
        comentario: motivo || 'Cancelado por el cliente antes del envío',
        usuarioId,
      });

      await queryRunner.commitTransaction();
      this.logger.log(`Pedido ${orden.nro} cancelado por el cliente ${usuarioId} (estaba ${estadoAnterior})`);
      return this.obtenerDetalle(id, usuarioId);
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      if (err instanceof HttpException) throw err;
      this.logger.error(`Error cancelando orden ${id}: ${err.message}`);
      throw new BadRequestException('No se pudo cancelar el pedido. Inténtalo de nuevo.');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reads an order with its payment, items and shipment while holding a write lock on the order row, so two
   * requests acting on the same order (an admin and the customer, or a double click) run one after the other.
   */
  private async cargarOrdenBloqueada(manager: EntityManager, id: string): Promise<OrderEntity> {
    const fila = await manager.findOne(OrderEntity, { where: { id, tenantId: this.tid }, lock: { mode: 'pessimistic_write' } });
    if (!fila) throw new NotFoundException(`La orden con ID ${id} no existe.`);
    // The lock is taken on the bare row: PostgreSQL does not allow FOR UPDATE across the outer joins of the relations.
    return (await manager.findOne(OrderEntity, {
      where: { id, tenantId: this.tid },
      relations: ['pago', 'pago.metodoPago', 'items', 'envio'],
    })) as OrderEntity;
  }

  /**
   * Moves an order to a new state following the transition rules, keeps its payment and shipment in step, gives the
   * reserved units back to stock once, and writes the audit entry. Throws when the move is not allowed.
   */
  private async aplicarCambioDeEstado(
    manager: EntityManager,
    orden: OrderEntity,
    estadoDestino: string,
    opciones: { comentario: string; usuarioId: string | null },
  ): Promise<void> {
    const pago: ContextoPago = orden.pago
      ? { tipo: tipoDePago(orden.pago.metodoPago?.nombre), estado: orden.pago.estado }
      : { tipo: 'otro', estado: null };
    const motivo = motivoTransicionInvalida(orden.estado, estadoDestino, pago);
    if (motivo) throw new BadRequestException(motivo);

    const estadoAnterior = orden.estado;
    const efectos = efectosDeTransicion(estadoAnterior, estadoDestino, pago);

    orden.estado = estadoDestino;
    await manager.save(OrderEntity, orden);

    if (orden.envio) {
      if (estadoDestino === 'ENVIADO') {
        orden.envio.estado = 'EN_CAMINO';
        if (!orden.envio.fechaEnvio) orden.envio.fechaEnvio = new Date();
        await manager.save(ShippingEntity, orden.envio);
      } else if (estadoDestino === 'ENTREGADO') {
        orden.envio.estado = 'ENTREGADO';
        orden.envio.fechaEntregaReal = new Date();
        await manager.save(ShippingEntity, orden.envio);
      } else if (estadoDestino === 'CANCELADO') {
        orden.envio.estado = 'CANCELADO';
        await manager.save(ShippingEntity, orden.envio);
      }
    }

    if (orden.pago && efectos.pago) {
      orden.pago.estado = efectos.pago;
      if (efectos.pago === 'APROBADO') orden.pago.fechaPago = new Date();
      await manager.save(PaymentEntity, orden.pago);
    }

    if (efectos.restaurarStock) {
      for (const item of orden.items ?? []) {
        if (item.varianteId) await manager.increment(ProductVariantEntity, { id: item.varianteId }, 'stock', item.cantidad);
      }
    }

    await manager.save(
      manager.create(OrderHistoryEntity, {
        notaventaId: orden.id,
        estadoAnterior,
        estadoNuevo: estadoDestino,
        comentario: opciones.comentario,
        usuarioId: opciones.usuarioId,
      }),
    );
  }

  // =========================================================================
  // HU-53: LISTAR TODOS LOS PEDIDOS CON FILTROS (ADMIN)
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
      .leftJoinAndSelect('o.envio', 'e')
      .leftJoinAndSelect('e.metodoEnvio', 'me')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('items.producto', 'prod')
      .leftJoinAndSelect('items.variante', 'v')
      .leftJoinAndSelect('v.talla', 'talla')
      .leftJoinAndSelect('v.color', 'color')
      .leftJoinAndSelect('o.cupon', 'cupon')
      .leftJoinAndSelect('o.historial', 'historial')
      .where('o.tenantId = :tid', { tid: this.tid })
      .orderBy('o.creadoEn', 'DESC');

    if (filtros?.estado && filtros.estado !== 'TODOS') {
      qb.andWhere('o.estado = :estado', { estado: filtros.estado.toUpperCase() });
    }

    if (filtros?.busqueda) {
      qb.andWhere(
        '(o.nro ILIKE :busq OR u.nombre ILIKE :busq OR u.apellido ILIKE :busq OR u.correo ILIKE :busq OR e.numeroTracking ILIKE :busq)',
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
  // HU-54 & HU-55: CAMBIAR ESTADO DE PEDIDO Y REGISTRAR EN HISTORIAL (ADMIN)
  // =========================================================================
  async actualizarEstadoAdmin(
    id: string,
    nuevoEstado: string,
    comentario?: string,
    adminId?: string,
  ) {
    const estadoDestino = String(nuevoEstado ?? '').trim().toUpperCase();
    if (!(ESTADOS_ORDEN as readonly string[]).includes(estadoDestino)) {
      throw new BadRequestException(`Estado no válido. Valores permitidos: ${ESTADOS_ORDEN.join(', ')}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orden = await this.cargarOrdenBloqueada(queryRunner.manager, id);
      if (orden.estado === estadoDestino) {
        await queryRunner.rollbackTransaction();
        return this.obtenerDetalle(id);
      }

      await this.aplicarCambioDeEstado(queryRunner.manager, orden, estadoDestino, {
        comentario: (comentario ?? '').trim().slice(0, 500) || `Cambio de estado por el administrador a ${estadoDestino}`,
        usuarioId: adminId || null,
      });

      await queryRunner.commitTransaction();
      return this.obtenerDetalle(id);
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      if (err instanceof HttpException) throw err;
      this.logger.error(`Error actualizando estado de orden ${id}: ${err.message}`);
      throw new BadRequestException('No se pudo actualizar el estado. Inténtalo de nuevo.');
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // HU-55: CONSULTAR HISTORIAL DE AUDITORÍA DE UN PEDIDO
  // =========================================================================
  async obtenerHistorial(ordenId: string) {
    return this.orderHistoryRepo.find({
      where: { notaventaId: ordenId, tenantId: this.tid },
      relations: ['usuario'],
      order: { creadoEn: 'ASC' },
    });
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
      envio: orden.envio
        ? {
            id: orden.envio.id,
            numeroTracking: orden.envio.numeroTracking,
            estado: orden.envio.estado,
            empresaTransportadora: orden.envio.empresaTransportadora || 'Courier Local',
            direccionTexto: orden.envio.direccionTexto,
            metodoEnvio: orden.envio.metodoEnvio?.nombre || 'Envío Estándar',
            fechaEnvio: orden.envio.fechaEnvio,
            fechaEntregaEstimada: orden.envio.fechaEntregaEstimada,
            fechaEntregaReal: orden.envio.fechaEntregaReal,
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
      historial: (orden.historial || []).map((h) => ({
        id: h.id,
        estadoAnterior: h.estadoAnterior,
        estadoNuevo: h.estadoNuevo,
        comentario: h.comentario,
        creadoEn: h.creadoEn,
        autor: h.usuario ? `${h.usuario.nombre} ${h.usuario.apellido}` : 'Sistema',
      })),
    };
  }
}
