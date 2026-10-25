import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrderEntity } from '../pedidos/entities/order.entity';
import { OrderItemEntity } from '../pedidos/entities/order-item.entity';
import { OrderHistoryEntity } from '../pedidos/entities/order-history.entity';
import { PaymentEntity } from '../pagos/entities/payment.entity';
import { PaymentMethodEntity } from '../pagos/entities/payment-method.entity';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CrearVentaPosDto } from './dto/crear-venta-pos.dto';

export interface StockConflictItem {
  varianteId: string;
  nombre: string | null;
  solicitado: number;
  disponible: number;
}

/**
 * Cash sales made at the counter. The items come in the body (a seller offline has no server
 * cart), prices are always the current ones, and the whole sale is one transaction: either every
 * item has stock and is taken, or nothing is written and the caller gets a 409 listing what is short.
 */
@Injectable()
export class PosSalesService {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly paymentMethodRepo: Repository<PaymentMethodEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private get tid(): string {
    return TenantContext.require();
  }

  async registrar(vendedorId: string, dto: CrearVentaPosDto, clave: string) {
    // One line per variant, locked in id order: two sales that share variants cannot deadlock
    const solicitado = new Map<string, number>();
    for (const item of dto.items) {
      solicitado.set(item.varianteId, (solicitado.get(item.varianteId) ?? 0) + item.cantidad);
    }
    const ids = [...solicitado.keys()].sort();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // The key is the identity of the sale: one execution at a time per key, and a key that already
      // produced an order gives that order back instead of selling again (even if the interceptor lost track of it)
      await queryRunner.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`pos-clave:${this.tid}:${clave}`]);
      const existente = await this.buscarPorClave(queryRunner, clave);
      if (existente) {
        await queryRunner.rollbackTransaction();
        return this.resumenDe(existente);
      }

      const bloqueadas: ProductVariantEntity[] = [];
      const conflictos: StockConflictItem[] = [];
      for (const id of ids) {
        const variante = await queryRunner.manager.findOne(ProductVariantEntity, {
          where: { id, tenantId: this.tid },
          lock: { mode: 'pessimistic_write' },
        });
        const pedido = solicitado.get(id)!;
        if (!variante || variante.activa === false) {
          conflictos.push({ varianteId: id, nombre: null, solicitado: pedido, disponible: 0 });
        } else if (variante.stock < pedido) {
          const info = await this.cargarInfo(queryRunner, id);
          conflictos.push({
            varianteId: id,
            nombre: info?.producto?.nombre ?? null,
            solicitado: pedido,
            disponible: variante.stock,
          });
        } else {
          bloqueadas.push(variante);
        }
      }

      if (conflictos.length) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          codigo: 'STOCK_CONFLICT',
          message: 'Stock insuficiente para completar la venta.',
          items: conflictos,
        });
      }

      // Same number sequence as the other sales, serialized per store while the sale is written
      await queryRunner.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`nro-venta:${this.tid}`]);
      const cantidadOrdenes = await queryRunner.manager.count(OrderEntity, { where: { tenantId: this.tid } });
      const nro = `NV-${new Date().getFullYear()}-${String(cantidadOrdenes + 1).padStart(5, '0')}`;

      const lineas: OrderItemEntity[] = [];
      let total = 0;
      for (const variante of bloqueadas) {
        const info = await this.cargarInfo(queryRunner, variante.id);
        const cantidad = solicitado.get(variante.id)!;
        const precio = Number(info?.producto?.precio ?? 0) + Number(variante.precioExtra || 0);
        const subtotal = Number((precio * cantidad).toFixed(2));
        total = Number((total + subtotal).toFixed(2));
        lineas.push(
          queryRunner.manager.create(OrderItemEntity, {
            productoId: variante.productoId,
            varianteId: variante.id,
            cantidad,
            precio,
            descuento: 0,
            subtotal,
            nombreProducto: info?.producto?.nombre || 'Prenda',
            talla: info?.talla?.nombre || 'Única',
            color: info?.color?.nombre || 'Original',
          }),
        );
        variante.stock -= cantidad;
        await queryRunner.manager.save(ProductVariantEntity, variante);
      }

      const ahora = new Date();
      const vendidoEn = dto.vendidoEn ? new Date(dto.vendidoEn) : ahora;
      const fecha = vendidoEn.getTime() > ahora.getTime() ? ahora : vendidoEn;

      const orden = await queryRunner.manager.save(
        queryRunner.manager.create(OrderEntity, {
          nro,
          usuarioId: vendedorId,
          subtotal: total,
          descuento: 0,
          costoEnvio: 0,
          total,
          estado: 'COMPLETADO',
          claveIdempotencia: clave,
        }),
      );
      if (dto.vendidoEn) {
        // fecha is a timestamp without zone that the database fills with NOW(): store the device's
        // instant the same way, not through the driver (which would write the server's local clock)
        await queryRunner.query(
          `UPDATE nota_venta SET fecha = $2::timestamptz AT TIME ZONE current_setting('TimeZone') WHERE id = $1`,
          [orden.id, fecha.toISOString()],
        );
      }
      for (const linea of lineas) linea.notaventaId = orden.id;
      await queryRunner.manager.save(lineas);

      const pago = await queryRunner.manager.save(
        queryRunner.manager.create(PaymentEntity, {
          notaventaId: orden.id,
          metodoPagoId: await this.resolverMetodoEfectivo(),
          monto: total,
          estado: 'APROBADO',
          idTransaccion: `POS-${nro}`,
          fechaPago: fecha,
          respuestaPasarela: {
            gateway: 'pos_efectivo',
            cliente: dto.clienteNombre ?? null,
            notas: dto.notas ?? null,
            vendidoEn: fecha.toISOString(),
          },
        }),
      );

      await queryRunner.manager.save(
        queryRunner.manager.create(OrderHistoryEntity, {
          notaventaId: orden.id,
          estadoAnterior: null,
          estadoNuevo: 'COMPLETADO',
          comentario: `Venta de mostrador en efectivo${dto.clienteNombre ? ` para ${dto.clienteNombre}` : ''}${
            dto.vendidoEn ? ` registrada en el dispositivo el ${fecha.toISOString()}` : ''
          }.`,
          usuarioId: vendedorId,
        }),
      );

      await queryRunner.commitTransaction();

      return {
        ordenId: orden.id,
        nroOrden: nro,
        fecha: fecha.toISOString(),
        total,
        items: lineas.map((l) => ({
          varianteId: l.varianteId,
          nombre: l.nombreProducto,
          talla: l.talla,
          color: l.color,
          cantidad: l.cantidad,
          precio: Number(l.precio),
          subtotal: Number(l.subtotal),
        })),
        pago: { id: pago.id, metodo: 'Efectivo', monto: total, estado: 'APROBADO' },
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      // The unique index on the key is the last barrier: if it fires, the sale already exists
      if (err?.code === '23505' && String(err.message).includes('uq_nota_venta_clave')) {
        const existente = await this.buscarPorClave(queryRunner, clave);
        if (existente) return this.resumenDe(existente);
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private buscarPorClave(queryRunner: { manager: any }, clave: string): Promise<OrderEntity | null> {
    return queryRunner.manager.findOne(OrderEntity, {
      where: { tenantId: this.tid, claveIdempotencia: clave },
      relations: ['items', 'pago'],
    });
  }

  /** The response of a registered sale, rebuilt from what is stored. */
  private resumenDe(orden: OrderEntity) {
    const total = Number(orden.total);
    return {
      ordenId: orden.id,
      nroOrden: orden.nro,
      fecha: new Date(orden.fecha).toISOString(),
      total,
      items: (orden.items ?? []).map((l) => ({
        varianteId: l.varianteId,
        nombre: l.nombreProducto,
        talla: l.talla,
        color: l.color,
        cantidad: l.cantidad,
        precio: Number(l.precio),
        subtotal: Number(l.subtotal),
      })),
      pago: { id: orden.pago?.id, metodo: 'Efectivo', monto: total, estado: 'APROBADO' },
    };
  }

  /** Product, size and color names, read without a lock (a locked read cannot join). */
  private cargarInfo(queryRunner: { manager: any }, varianteId: string) {
    return queryRunner.manager.findOne(ProductVariantEntity, {
      where: { id: varianteId, tenantId: this.tid },
      relations: ['producto', 'talla', 'color'],
    });
  }

  private async resolverMetodoEfectivo(): Promise<string> {
    const efectivo = await this.paymentMethodRepo
      .createQueryBuilder('m')
      .where('LOWER(m.nombre) LIKE :k1 OR LOWER(m.nombre) LIKE :k2', { k1: '%efectivo%', k2: '%contra%' })
      .getOne();
    if (efectivo) return efectivo.id;
    const cualquiera = await this.paymentMethodRepo.findOne({ where: { activo: true } });
    if (!cualquiera) throw new ConflictException('No hay un método de pago en efectivo configurado.');
    return cualquiera.id;
  }
}
