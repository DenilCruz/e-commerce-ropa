import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderHistoryEntity } from './entities/order-history.entity';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { ShippingEntity } from '../envios/entities/shipping.entity';
import { PaymentEntity } from '../pagos/entities/payment.entity';

@Injectable()
export class OrdersService {
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
    const orden = await this.orderRepo.findOne({
      where: { id },
      relations: ['items', 'pago', 'envio'],
    });

    if (!orden) {
      throw new NotFoundException(`La orden con ID ${id} no existe.`);
    }

    if (orden.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tienes permiso para cancelar esta orden.');
    }

    if (orden.estado === 'CANCELADO') {
      throw new BadRequestException('Esta orden ya se encuentra cancelada.');
    }

    if (orden.estado === 'ENVIADO' || orden.estado === 'ENTREGADO') {
      throw new BadRequestException('No se puede cancelar el pedido porque ya fue despachado o entregado.');
    }

    if (orden.envio && ['EN_CAMINO', 'EN_REPARTO', 'ENTREGADO'].includes(orden.envio.estado)) {
      throw new BadRequestException('El paquete ya está en tránsito con la transportadora y no puede cancelarse.');
    }

    const estadoAnterior = orden.estado;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Cambiar estado de la orden a CANCELADO
      orden.estado = 'CANCELADO';
      await queryRunner.manager.save(orden);

      // 2. Si tenía envío asociado, actualizar a CANCELADO
      if (orden.envio) {
        orden.envio.estado = 'CANCELADO';
        await queryRunner.manager.save(ShippingEntity, orden.envio);
      }

      // 3. Si tenía pago aprobado, marcar como REEMBOLSADO
      if (orden.pago && orden.pago.estado === 'APROBADO') {
        orden.pago.estado = 'REEMBOLSADO';
        await queryRunner.manager.save(PaymentEntity, orden.pago);
      }

      // 4. Restaurar stock de los productos
      if (orden.items && orden.items.length > 0) {
        for (const item of orden.items) {
          if (item.varianteId) {
            await queryRunner.manager.increment(
              ProductVariantEntity,
              { id: item.varianteId },
              'stock',
              item.cantidad,
            );
          }
        }
      }

      // 5. Registrar en historial_venta (HU-55)
      const historial = queryRunner.manager.create(OrderHistoryEntity, {
        notaventaId: orden.id,
        estadoAnterior,
        estadoNuevo: 'CANCELADO',
        comentario: motivo || 'Cancelado por el cliente antes del envío',
        usuarioId,
      });
      await queryRunner.manager.save(historial);

      await queryRunner.commitTransaction();

      this.logger.log(`Pedido ${orden.nro} cancelado exitosamente por cliente ${usuarioId}`);
      return this.obtenerDetalle(id, usuarioId);
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error cancelando orden ${id}: ${err.message}`);
      throw new BadRequestException(`No se pudo cancelar el pedido: ${err.message}`);
    } finally {
      await queryRunner.release();
    }
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
    const orden = await this.orderRepo.findOne({
      where: { id },
      relations: ['pago', 'items', 'envio'],
    });

    if (!orden) {
      throw new NotFoundException(`Orden ${id} no encontrada.`);
    }

    const estadosValidos = [
      'PENDIENTE',
      'PAGADO',
      'COMPLETADO',
      'ENVIADO',
      'ENTREGADO',
      'CANCELADO',
      'REEMBOLSADO',
    ];
    const estadoDestino = nuevoEstado.toUpperCase();
    if (!estadosValidos.includes(estadoDestino)) {
      throw new BadRequestException(`Estado no válido. Valores permitidos: ${estadosValidos.join(', ')}`);
    }

    const estadoAnterior = orden.estado;
    if (estadoAnterior === estadoDestino) {
      return this.obtenerDetalle(id);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      orden.estado = estadoDestino;
      await queryRunner.manager.save(orden);

      // Si se pasa a ENVIADO, sincronizar envío a EN_CAMINO
      if (estadoDestino === 'ENVIADO' && orden.envio) {
        orden.envio.estado = 'EN_CAMINO';
        if (!orden.envio.fechaEnvio) orden.envio.fechaEnvio = new Date();
        await queryRunner.manager.save(ShippingEntity, orden.envio);
      }

      // Si se pasa a ENTREGADO, sincronizar envío a ENTREGADO
      if (estadoDestino === 'ENTREGADO' && orden.envio) {
        orden.envio.estado = 'ENTREGADO';
        orden.envio.fechaEntregaReal = new Date();
        await queryRunner.manager.save(ShippingEntity, orden.envio);
      }

      // Si se cancela/reembolsa por admin, restaurar stock si no estaba cancelado
      if (
        (estadoDestino === 'CANCELADO' || estadoDestino === 'REEMBOLSADO') &&
        estadoAnterior !== 'CANCELADO' &&
        estadoAnterior !== 'REEMBOLSADO'
      ) {
        if (orden.items && orden.items.length > 0) {
          for (const item of orden.items) {
            if (item.varianteId) {
              await queryRunner.manager.increment(
                ProductVariantEntity,
                { id: item.varianteId },
                'stock',
                item.cantidad,
              );
            }
          }
        }
      }

      // Registrar en historial_venta (HU-55)
      const hist = queryRunner.manager.create(OrderHistoryEntity, {
        notaventaId: orden.id,
        estadoAnterior,
        estadoNuevo: estadoDestino,
        comentario: comentario || `Cambio de estado por el administrador a ${estadoDestino}`,
        usuarioId: adminId || null,
      });
      await queryRunner.manager.save(hist);

      await queryRunner.commitTransaction();
      return this.obtenerDetalle(id);
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error actualizando estado de orden ${id}: ${err.message}`);
      throw new BadRequestException(`No se pudo actualizar el estado: ${err.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // HU-55: CONSULTAR HISTORIAL DE AUDITORÍA DE UN PEDIDO
  // =========================================================================
  async obtenerHistorial(ordenId: string) {
    return this.orderHistoryRepo.find({
      where: { notaventaId: ordenId },
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
