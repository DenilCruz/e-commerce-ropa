import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
const StripeClient = require('stripe');

import { PaymentEntity } from './entities/payment.entity';
import { PaymentMethodEntity } from './entities/payment-method.entity';
import { OrderEntity } from '../pedidos/entities/order.entity';
import { OrderItemEntity } from '../pedidos/entities/order-item.entity';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { ProductEntity } from '../productos/entities/product.entity';
import { CartEntity } from '../carrito/entities/cart.entity';
import { CartItemEntity } from '../carrito/entities/cart-item.entity';
import { CouponEntity } from '../cupones/entities/coupon.entity';
import { UserEntity } from '../usuarios/entities/user.entity';

import { CrearIntentoPagoDto } from './dto/crear-intento-pago.dto';
import { ConfirmarPagoTarjetaDto } from './dto/confirmar-pago-tarjeta.dto';
import { PagoContraEntregaDto } from './dto/pago-contra-entrega.dto';
import { ReembolsarPagoDto } from './dto/reembolsar-pago.dto';

const METODO_TARJETA_ID = '5d6c0b39-63f4-4cb1-b0df-66aa706e44e5';
const METODO_CONTRA_ENTREGA_ID = '17817d50-a056-4697-a572-bf7145b63646';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(PaymentMethodEntity)
    private readonly paymentMethodRepo: Repository<PaymentMethodEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepo: Repository<ProductVariantEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepo: Repository<CartItemEntity>,
    @InjectRepository(CouponEntity)
    private readonly couponRepo: Repository<CouponEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    const secretKey =
      this.configService.get<string>('STRIPE_SECRET_KEY') ||
      process.env.STRIPE_SECRET_KEY ||
      '';

    this.stripe = new StripeClient(secretKey, {
      apiVersion: '2026-08-26.dahlia',
    });
  }

  // =========================================================================
  // METODOS DE PAGO DISPONIBLES
  // =========================================================================
  async listarMetodosPago() {
    return this.paymentMethodRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  // =========================================================================
  // HU-56: CREAR INTENTO DE PAGO CON STRIPE (PaymentIntent)
  // =========================================================================
  async crearIntentoPago(usuarioId: string, dto: CrearIntentoPagoDto) {
    const { subtotal, descuento, envio, totalFinal, cart, cupon } =
      await this.calcularTotalesCarrito(usuarioId, dto.cuponId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('El carrito de compras está vacío.');
    }

    // Validar stock antes de crear intento
    for (const item of cart.items) {
      if (item.variante && item.cantidad > item.variante.stock) {
        throw new BadRequestException(
          `Stock insuficiente para "${item.variante.producto?.nombre}". Disponible: ${item.variante.stock}.`,
        );
      }
    }

    // En Stripe el monto va en centavos (ej: 150.50 Bs -> 15050)
    const amountInCents = Math.round(totalFinal * 100);

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'bob',
        description: `Compra El Magnifico - Usuario ${usuarioId}`,
        metadata: {
          usuarioId,
          cuponId: cupon ? cupon.id : '',
          subtotal: subtotal.toString(),
          descuento: descuento.toString(),
          costoEnvio: envio.toString(),
          totalFinal: totalFinal.toString(),
          direccionEnvio: dto.direccionEnvio || '',
          telefono: dto.telefono || '',
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        monto: totalFinal,
        moneda: 'BOB',
        subtotal,
        descuento,
        envio,
        totalFinal,
        cupon: cupon ? { id: cupon.id, codigo: cupon.codigo, valor: cupon.valor } : null,
      };
    } catch (err: any) {
      this.logger.error(`Error al crear PaymentIntent en Stripe: ${err.message}`);
      throw new BadRequestException(`Error en pasarela Stripe: ${err.message}`);
    }
  }

  // =========================================================================
  // HU-56 / HU-58: CONFIRMAR PAGO CON TARJETA Y ACTUALIZAR PEDIDO (SISTEMA)
  // =========================================================================
  async confirmarPagoTarjeta(usuarioId: string, dto: ConfirmarPagoTarjetaDto) {
    let paymentIntent: Stripe.PaymentIntent;

    try {
      paymentIntent = await this.stripe.paymentIntents.retrieve(dto.paymentIntentId);
    } catch (err: any) {
      throw new BadRequestException(`No se pudo verificar la transacción con Stripe: ${err.message}`);
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException(
        `El pago en Stripe no fue completado exitosamente. Estado actual: ${paymentIntent.status}`,
      );
    }

    const { subtotal, descuento, envio, totalFinal, cart, cupon } =
      await this.calcularTotalesCarrito(usuarioId, dto.cuponId);

    if (!cart.items || cart.items.length === 0) {
      // Verificar si ya se procesó previamente con este PaymentIntent
      const pagoExistente = await this.paymentRepo.findOne({
        where: { idTransaccion: dto.paymentIntentId },
        relations: ['notaventa', 'notaventa.items', 'metodoPago'],
      });

      if (pagoExistente) {
        return this.formatearRespuestaPago(pagoExistente.notaventa, pagoExistente);
      }

      throw new BadRequestException('El carrito está vacío o la orden ya fue procesada.');
    }

    // Ejecutar creación de orden, pago y reducción de stock en transacción atómica
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Generar número de orden único
      const countOrders = await this.orderRepo.count();
      const orderNro = `NV-${new Date().getFullYear()}-${String(countOrders + 1).padStart(5, '0')}`;

      // 2. Crear nota_venta
      const nuevaOrden = queryRunner.manager.create(OrderEntity, {
        nro: orderNro,
        usuarioId,
        subtotal,
        descuento,
        costoEnvio: envio,
        total: totalFinal,
        estado: 'PAGADO', // HU-58: Actualizar pedido al recibir confirmación
        cuponId: cupon ? cupon.id : null,
      });

      const ordenGuardada = await queryRunner.manager.save(nuevaOrden);

      // 3. Crear detalles_nota_venta y descontar stock de variantes
      const orderItems: OrderItemEntity[] = [];
      for (const item of cart.items) {
        const precioUnitario = Number(item.precioUnitario || item.variante?.producto?.precio || 0);
        const itemSubtotal = Number((precioUnitario * item.cantidad).toFixed(2));

        const orderItem = queryRunner.manager.create(OrderItemEntity, {
          notaventaId: ordenGuardada.id,
          productoId: item.variante?.productoId || item.varianteId,
          varianteId: item.varianteId,
          cantidad: item.cantidad,
          precio: precioUnitario,
          descuento: 0,
          subtotal: itemSubtotal,
          nombreProducto: item.variante?.producto?.nombre || 'Prenda',
          talla: item.variante?.talla?.nombre || 'Única',
          color: item.variante?.color?.nombre || 'Original',
        });
        orderItems.push(orderItem);

        // Descontar stock
        await queryRunner.manager.decrement(
          ProductVariantEntity,
          { id: item.varianteId },
          'stock',
          item.cantidad,
        );
      }
      await queryRunner.manager.save(orderItems);

      // 4. Crear registro en tabla pago (HU-58)
      const nuevoPago = queryRunner.manager.create(PaymentEntity, {
        notaventaId: ordenGuardada.id,
        metodoPagoId: METODO_TARJETA_ID,
        monto: totalFinal,
        estado: 'APROBADO',
        idTransaccion: paymentIntent.id,
        fechaPago: new Date(),
        respuestaPasarela: {
          gateway: 'stripe',
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          currency: paymentIntent.currency,
          amount_received: paymentIntent.amount_received,
          created: paymentIntent.created,
          payment_method: paymentIntent.payment_method,
        },
      });
      const pagoGuardado = await queryRunner.manager.save(nuevoPago);

      // 5. Vaciar carrito del usuario
      await queryRunner.manager.delete(CartItemEntity, { carritoId: cart.id });
      await queryRunner.manager.update(CartEntity, { id: cart.id }, { total: 0 });

      // Si se usó cupón, incrementar usos
      if (cupon) {
        await queryRunner.manager.increment(CouponEntity, { id: cupon.id }, 'usosActuales', 1);
      }

      await queryRunner.commitTransaction();

      ordenGuardada.items = orderItems;
      return this.formatearRespuestaPago(ordenGuardada, pagoGuardado);
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error procesando confirmación de pago: ${err.message}`);
      throw new BadRequestException(`No se pudo procesar la orden: ${err.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // HU-60: PAGO CONTRA ENTREGA (EFECTIVO)
  // =========================================================================
  async pagoContraEntrega(usuarioId: string, dto: PagoContraEntregaDto) {
    const { subtotal, descuento, envio, totalFinal, cart, cupon } =
      await this.calcularTotalesCarrito(usuarioId, dto.cuponId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('El carrito de compras está vacío.');
    }

    // Validar stock
    for (const item of cart.items) {
      if (item.variante && item.cantidad > item.variante.stock) {
        throw new BadRequestException(
          `Stock insuficiente para "${item.variante.producto?.nombre}". Disponible: ${item.variante.stock}.`,
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const countOrders = await this.orderRepo.count();
      const orderNro = `NV-${new Date().getFullYear()}-${String(countOrders + 1).padStart(5, '0')}`;

      // 1. Crear nota_venta con estado PENDIENTE
      const nuevaOrden = queryRunner.manager.create(OrderEntity, {
        nro: orderNro,
        usuarioId,
        subtotal,
        descuento,
        costoEnvio: envio,
        total: totalFinal,
        estado: 'PENDIENTE',
        cuponId: cupon ? cupon.id : null,
      });

      const ordenGuardada = await queryRunner.manager.save(nuevaOrden);

      // 2. Crear detalles y reservar stock
      const orderItems: OrderItemEntity[] = [];
      for (const item of cart.items) {
        const precioUnitario = Number(item.precioUnitario || item.variante?.producto?.precio || 0);
        const itemSubtotal = Number((precioUnitario * item.cantidad).toFixed(2));

        const orderItem = queryRunner.manager.create(OrderItemEntity, {
          notaventaId: ordenGuardada.id,
          productoId: item.variante?.productoId || item.varianteId,
          varianteId: item.varianteId,
          cantidad: item.cantidad,
          precio: precioUnitario,
          descuento: 0,
          subtotal: itemSubtotal,
          nombreProducto: item.variante?.producto?.nombre || 'Prenda',
          talla: item.variante?.talla?.nombre || 'Única',
          color: item.variante?.color?.nombre || 'Original',
        });
        orderItems.push(orderItem);

        await queryRunner.manager.decrement(
          ProductVariantEntity,
          { id: item.varianteId },
          'stock',
          item.cantidad,
        );
      }
      await queryRunner.manager.save(orderItems);

      // 3. Crear registro pago con estado PENDIENTE
      const nuevoPago = queryRunner.manager.create(PaymentEntity, {
        notaventaId: ordenGuardada.id,
        metodoPagoId: METODO_CONTRA_ENTREGA_ID,
        monto: totalFinal,
        estado: 'PENDIENTE',
        idTransaccion: `COD-${orderNro}`,
        respuestaPasarela: {
          gateway: 'contra_entrega',
          instrucciones: 'El cliente pagará en efectivo al momento de la entrega del pedido.',
          direccionEnvio: dto.direccionEnvio || '',
          telefono: dto.telefono || '',
        },
      });
      const pagoGuardado = await queryRunner.manager.save(nuevoPago);

      // 4. Vaciar carrito
      await queryRunner.manager.delete(CartItemEntity, { carritoId: cart.id });
      await queryRunner.manager.update(CartEntity, { id: cart.id }, { total: 0 });

      if (cupon) {
        await queryRunner.manager.increment(CouponEntity, { id: cupon.id }, 'usosActuales', 1);
      }

      await queryRunner.commitTransaction();

      ordenGuardada.items = orderItems;
      return this.formatearRespuestaPago(ordenGuardada, pagoGuardado);
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error en pago contra entrega: ${err.message}`);
      throw new BadRequestException(`No se pudo procesar el pedido contra entrega: ${err.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // HU-57: CONSULTAR ESTADO DE PAGO Y COMPROBANTE
  // =========================================================================
  async consultarEstadoPago(usuarioId: string, ordenId: string, userRole?: string) {
    const orden = await this.orderRepo.findOne({
      where: { id: ordenId },
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
      throw new NotFoundException(`La orden con ID ${ordenId} no existe.`);
    }

    const isAdmin = userRole?.toUpperCase() === 'ADMIN' || userRole?.toUpperCase() === 'SUPERADMIN';
    if (!isAdmin && orden.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tienes permiso para ver esta orden.');
    }

    return this.formatearRespuestaPago(orden, orden.pago);
  }

  // =========================================================================
  // HU-59: REEMBOLSAR PAGO (ADMIN)
  // =========================================================================
  async reembolsarPago(adminId: string, ordenId: string, dto: ReembolsarPagoDto) {
    const orden = await this.orderRepo.findOne({
      where: { id: ordenId },
      relations: ['pago', 'pago.metodoPago', 'items'],
    });

    if (!orden) {
      throw new NotFoundException(`Orden ${ordenId} no encontrada.`);
    }

    const pago = orden.pago;
    if (!pago) {
      throw new BadRequestException('Esta orden no tiene un registro de pago asociado.');
    }

    if (pago.estado === 'REEMBOLSADO') {
      throw new BadRequestException('Este pago ya ha sido reembolsado anteriormente.');
    }

    let refundStripeResult: any = null;

    // Si fue pagado por Stripe (idTransaccion inicia con pi_), procesar en la pasarela
    if (pago.idTransaccion && pago.idTransaccion.startsWith('pi_')) {
      try {
        refundStripeResult = await this.stripe.refunds.create({
          payment_intent: pago.idTransaccion,
          reason: 'requested_by_customer',
          metadata: {
            adminId,
            ordenId: orden.id,
            nroOrden: orden.nro,
            motivo: dto.motivo || 'Reclamo de cliente',
          },
        });
        this.logger.log(`Reembolso Stripe exitoso: ${refundStripeResult.id} para PaymentIntent ${pago.idTransaccion}`);
      } catch (err: any) {
        this.logger.error(`Error al ejecutar reembolso en Stripe: ${err.message}`);
        throw new BadRequestException(`Fallo en pasarela Stripe al reembolsar: ${err.message}`);
      }
    }

    // Transacción para actualizar BD y restaurar stock
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Actualizar estado de Pago a REEMBOLSADO
      pago.estado = 'REEMBOLSADO';
      pago.respuestaPasarela = {
        ...(pago.respuestaPasarela || {}),
        reembolso: {
          fecha: new Date(),
          adminId,
          motivo: dto.motivo || 'Reembolso por reclamo de cliente',
          stripeRefundId: refundStripeResult?.id || null,
          stripeStatus: refundStripeResult?.status || 'succeeded',
        },
      };
      await queryRunner.manager.save(pago);

      // 2. Actualizar estado de Orden a REEMBOLSADO
      orden.estado = 'REEMBOLSADO';
      await queryRunner.manager.save(orden);

      // 3. Restaurar stock de las prendas devueltas
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

      await queryRunner.commitTransaction();

      return {
        success: true,
        mensaje: `El pago de la orden ${orden.nro} fue reembolsado exitosamente.`,
        ordenId: orden.id,
        nroOrden: orden.nro,
        montoReembolsado: pago.monto,
        estadoPago: 'REEMBOLSADO',
        estadoOrden: 'REEMBOLSADO',
        stripeRefundId: refundStripeResult?.id || null,
        fechaReembolso: new Date(),
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error guardando reembolso en BD: ${err.message}`);
      throw new BadRequestException(`Error al registrar el reembolso: ${err.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // HELPERS
  // =========================================================================
  private async calcularTotalesCarrito(usuarioId: string, cuponId?: string) {
    let cart = await this.cartRepo.findOne({
      where: { usuarioId },
      relations: [
        'items',
        'items.variante',
        'items.variante.producto',
        'items.variante.talla',
        'items.variante.color',
      ],
    });

    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ usuarioId, total: 0 }));
      cart.items = [];
    }

    let subtotal = 0;
    if (cart.items && cart.items.length > 0) {
      for (const item of cart.items) {
        const precio = Number(item.precioUnitario || item.variante?.producto?.precio || 0);
        subtotal += precio * item.cantidad;
      }
    }

    let cupon: CouponEntity | null = null;
    let descuento = 0;

    if (cuponId) {
      cupon = await this.couponRepo.findOne({ where: { id: cuponId, activo: true } });
      if (cupon) {
        if (cupon.tipo === 'PORCENTAJE') {
          descuento = (subtotal * Number(cupon.valor)) / 100;
        } else {
          descuento = Number(cupon.valor);
        }
        descuento = Math.min(descuento, subtotal);
      }
    }

    const envio = subtotal >= 200 || subtotal === 0 ? 0 : 15;
    const totalFinal = Number(Math.max(0, subtotal - descuento + envio).toFixed(2));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      descuento: Number(descuento.toFixed(2)),
      envio,
      totalFinal,
      cart,
      cupon,
    };
  }

  private formatearRespuestaPago(orden: OrderEntity, pago?: PaymentEntity) {
    return {
      ordenId: orden.id,
      nroOrden: orden.nro,
      fecha: orden.fecha || orden.creadoEn,
      estadoOrden: orden.estado,
      subtotal: Number(orden.subtotal),
      descuento: Number(orden.descuento),
      costoEnvio: Number(orden.costoEnvio),
      total: Number(orden.total),
      pago: pago
        ? {
            id: pago.id,
            monto: Number(pago.monto),
            estado: pago.estado, // PENDIENTE | APROBADO | RECHAZADO | REEMBOLSADO
            idTransaccion: pago.idTransaccion,
            metodoPago: pago.metodoPago?.nombre || (pago.idTransaccion?.startsWith('COD') ? 'Efectivo contra entrega' : 'Tarjeta de Débito/Crédito'),
            fechaPago: pago.fechaPago || pago.creadoEn,
            respuestaPasarela: pago.respuestaPasarela,
          }
        : null,
      items: (orden.items || []).map((item) => ({
        id: item.id,
        productoId: item.productoId,
        nombre: item.nombreProducto,
        talla: item.talla,
        color: item.color,
        cantidad: item.cantidad,
        precio: Number(item.precio),
        subtotal: Number(item.subtotal),
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
