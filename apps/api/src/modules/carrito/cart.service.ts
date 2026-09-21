import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { CartEntity } from './entities/cart.entity';
import { CartItemEntity } from './entities/cart-item.entity';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { ProductEntity } from '../productos/entities/product.entity';

import { AgregarItemCarritoDto } from './dto/agregar-item-carrito.dto';
import { ActualizarCantidadItemDto } from './dto/actualizar-cantidad-item.dto';
import { SincronizarCarritoDto } from './dto/sincronizar-carrito.dto';
import { CalcularCarritoTemporalDto } from './dto/calcular-carrito-temporal.dto';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepo: Repository<CartItemEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepo: Repository<ProductVariantEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // HU-41 / HU-44 / HU-45: OBTENER O CREAR CARRITO DEL CLIENTE
  // =========================================================================
  async obtenerOCrearCarrito(usuarioId: string) {
    let cart = await this.cartRepo.findOne({
      where: { usuarioId },
      relations: [
        'items',
        'items.variante',
        'items.variante.producto',
        'items.variante.producto.imagenes',
        'items.variante.talla',
        'items.variante.color',
      ],
    });

    if (!cart) {
      const nuevoCarrito = this.cartRepo.create({
        usuarioId,
        total: 0,
      });
      cart = await this.cartRepo.save(nuevoCarrito);
      cart.items = [];
    }

    return this.formatearCarrito(cart);
  }

  // =========================================================================
  // HU-40 / HU-46: AGREGAR PRODUCTO AL CARRITO CON TALLA Y COLOR Y VALIDACIÓN
  // =========================================================================
  async agregarItem(usuarioId: string, dto: AgregarItemCarritoDto) {
    const variante = await this.resolverVariante(dto);

    // HU-46: Validar si la variante está activa
    if (!variante.activa) {
      throw new BadRequestException('La variante seleccionada no está disponible para la venta.');
    }

    // Asegurar carrito
    let cart = await this.cartRepo.findOne({
      where: { usuarioId },
      relations: ['items'],
    });

    if (!cart) {
      cart = await this.cartRepo.save(
        this.cartRepo.create({ usuarioId, total: 0 }),
      );
      cart.items = [];
    }

    // Buscar si la variante ya está en el carrito
    const itemExistente = await this.cartItemRepo.findOne({
      where: { carritoId: cart.id, varianteId: variante.id },
    });

    const cantidadDeseada = (itemExistente ? itemExistente.cantidad : 0) + (dto.cantidad || 1);

    // HU-46: Validar stock disponible
    if (cantidadDeseada > variante.stock) {
      throw new BadRequestException(
        `Stock insuficiente para "${variante.producto?.nombre || 'este producto'}". Disponible: ${variante.stock} unidades (intentas agregar ${cantidadDeseada}).`,
      );
    }

    const precioBase = Number(variante.producto?.precio || 0);
    const precioExtra = Number(variante.precioExtra || 0);
    const precioUnitario = precioBase + precioExtra;

    if (itemExistente) {
      itemExistente.cantidad = cantidadDeseada;
      itemExistente.precioUnitario = precioUnitario;
      await this.cartItemRepo.save(itemExistente);
    } else {
      const nuevoItem = this.cartItemRepo.create({
        carritoId: cart.id,
        varianteId: variante.id,
        cantidad: dto.cantidad || 1,
        precioUnitario,
      });
      await this.cartItemRepo.save(nuevoItem);
    }

    // Recalcular y actualizar total
    await this.recalcularTotalCarrito(cart.id);

    return this.obtenerOCrearCarrito(usuarioId);
  }

  // =========================================================================
  // HU-42 / HU-46: CAMBIAR CANTIDAD DE UN ITEM
  // =========================================================================
  async actualizarCantidadItem(
    usuarioId: string,
    itemId: string,
    dto: ActualizarCantidadItemDto,
  ) {
    const item = await this.cartItemRepo.findOne({
      where: { id: itemId },
      relations: ['carrito', 'variante', 'variante.producto'],
    });

    if (!item || item.carrito.usuarioId !== usuarioId) {
      throw new NotFoundException('El artículo no existe o no pertenece a tu carrito.');
    }

    if (dto.cantidad <= 0) {
      await this.cartItemRepo.remove(item);
    } else {
      // HU-46: Validar stock
      if (dto.cantidad > item.variante.stock) {
        throw new BadRequestException(
          `Stock insuficiente para "${item.variante.producto?.nombre || 'este producto'}". Solo hay ${item.variante.stock} unidades disponibles.`,
        );
      }

      item.cantidad = dto.cantidad;
      await this.cartItemRepo.save(item);
    }

    await this.recalcularTotalCarrito(item.carritoId);
    return this.obtenerOCrearCarrito(usuarioId);
  }

  // =========================================================================
  // HU-43: ELIMINAR ITEM DEL CARRITO
  // =========================================================================
  async eliminarItem(usuarioId: string, itemId: string) {
    const item = await this.cartItemRepo.findOne({
      where: { id: itemId },
      relations: ['carrito'],
    });

    if (!item || item.carrito.usuarioId !== usuarioId) {
      throw new NotFoundException('El artículo no existe o no pertenece a tu carrito.');
    }

    const carritoId = item.carritoId;
    await this.cartItemRepo.remove(item);
    await this.recalcularTotalCarrito(carritoId);

    return this.obtenerOCrearCarrito(usuarioId);
  }

  // =========================================================================
  // HU-43: VACIAR CARRITO
  // =========================================================================
  async vaciarCarrito(usuarioId: string) {
    const cart = await this.cartRepo.findOne({ where: { usuarioId } });
    if (cart) {
      await this.cartItemRepo.delete({ carritoId: cart.id });
      cart.total = 0;
      await this.cartRepo.save(cart);
    }
    return this.obtenerOCrearCarrito(usuarioId);
  }

  // =========================================================================
  // HU-47: SINCRONIZAR CARRITO TEMPORAL DE VISITANTE TRAS INICIAR SESIÓN
  // =========================================================================
  async sincronizarCarrito(usuarioId: string, dto: SincronizarCarritoDto) {
    if (!dto.items || dto.items.length === 0) {
      return this.obtenerOCrearCarrito(usuarioId);
    }

    for (const itemDto of dto.items) {
      try {
        await this.agregarItem(usuarioId, itemDto);
      } catch (error) {
        this.logger.warn(`No se pudo sincronizar item temporal: ${error?.message}`);
      }
    }

    return this.obtenerOCrearCarrito(usuarioId);
  }

  // =========================================================================
  // HU-47: CALCULAR CARRITO TEMPORAL PARA VISITANTES (SIN PERSISTENCIA)
  // =========================================================================
  async calcularCarritoTemporal(dto: CalcularCarritoTemporalDto) {
    const itemsFormateados: any[] = [];
    let totalGeneral = 0;
    let totalItems = 0;

    const items = dto?.items || [];
    for (const itemDto of items) {
      try {
        const variante = await this.resolverVariante(itemDto);
        const precioBase = Number(variante.producto?.precio || 0);
        const precioExtra = Number(variante.precioExtra || 0);
        const precioUnitario = precioBase + precioExtra;
        const cantidadValida = Math.min(itemDto.cantidad || 1, variante.stock);
        const subtotal = precioUnitario * cantidadValida;

        totalGeneral += subtotal;
        totalItems += cantidadValida;

        const imagenPrincipal =
          variante.producto?.imagenes?.find((img) => img.principal)?.url ||
          variante.producto?.imagenes?.[0]?.url ||
          null;

        itemsFormateados.push({
          varianteId: variante.id,
          cantidad: cantidadValida,
          precioUnitario,
          subtotal,
          stockDisponible: variante.stock,
          stockSuficiente: (itemDto.cantidad || 1) <= variante.stock,
          producto: {
            id: variante.producto?.id,
            nombre: variante.producto?.nombre,
            precioBase,
            imagen: imagenPrincipal,
          },
          talla: variante.talla ? { id: variante.talla.id, nombre: variante.talla.nombre } : null,
          color: variante.color ? { id: variante.color.id, nombre: variante.color.nombre } : null,
        });
      } catch (err) {
        this.logger.warn(`Error procesando item temporal: ${err?.message}`);
      }
    }

    return {
      items: itemsFormateados,
      totalItems,
      total: Number(totalGeneral.toFixed(2)),
    };
  }

  // =========================================================================
  // MÉTODOS PRIVADOS AUXILIARES
  // =========================================================================
  private async resolverVariante(dto: AgregarItemCarritoDto): Promise<ProductVariantEntity> {
    if (dto.varianteId) {
      const variante = await this.variantRepo.findOne({
        where: { id: dto.varianteId },
        relations: ['producto', 'producto.imagenes', 'talla', 'color'],
      });
      if (!variante) {
        throw new NotFoundException(`Variante con ID ${dto.varianteId} no encontrada.`);
      }
      return variante;
    }

    if (dto.productoId) {
      const query: any = { productoId: dto.productoId };
      if (dto.tallaId) query.tallaId = dto.tallaId;
      if (dto.colorId) query.colorId = dto.colorId;

      const variante = await this.variantRepo.findOne({
        where: query,
        relations: ['producto', 'producto.imagenes', 'talla', 'color'],
      });

      if (!variante) {
        throw new NotFoundException(
          'No existe una variante disponible con la combinación de talla y color seleccionada.',
        );
      }
      return variante;
    }

    throw new BadRequestException('Debes proporcionar el varianteId o la combinación de productoId, tallaId y colorId.');
  }

  private async recalcularTotalCarrito(carritoId: string): Promise<number> {
    const items = await this.cartItemRepo.find({ where: { carritoId } });
    const nuevoTotal = items.reduce(
      (sum, item) => sum + Number(item.cantidad) * Number(item.precioUnitario),
      0,
    );
    const totalRedondeado = Number(nuevoTotal.toFixed(2));

    await this.cartRepo.update(
      { id: carritoId },
      { total: totalRedondeado, actualizadoEn: new Date() },
    );

    return totalRedondeado;
  }

  private formatearCarrito(cart: CartEntity) {
    const itemsFormateados = (cart.items || []).map((item) => {
      const precioUnitario = Number(item.precioUnitario);
      const subtotal = Number((precioUnitario * item.cantidad).toFixed(2));

      const imagenPrincipal =
        item.variante?.producto?.imagenes?.find((img) => img.principal)?.url ||
        item.variante?.producto?.imagenes?.[0]?.url ||
        null;

      return {
        id: item.id,
        varianteId: item.varianteId,
        cantidad: item.cantidad,
        precioUnitario,
        subtotal,
        stockDisponible: item.variante?.stock ?? 0,
        producto: {
          id: item.variante?.producto?.id,
          nombre: item.variante?.producto?.nombre,
          precioBase: Number(item.variante?.producto?.precio || 0),
          imagen: imagenPrincipal,
        },
        talla: item.variante?.talla
          ? { id: item.variante.talla.id, nombre: item.variante.talla.nombre }
          : null,
        color: item.variante?.color
          ? { id: item.variante.color.id, nombre: item.variante.color.nombre }
          : null,
      };
    });

    const totalGeneral = itemsFormateados.reduce((sum, it) => sum + it.subtotal, 0);
    const totalItems = itemsFormateados.reduce((sum, it) => sum + it.cantidad, 0);

    return {
      id: cart.id,
      usuarioId: cart.usuarioId,
      items: itemsFormateados,
      totalItems,
      total: Number(totalGeneral.toFixed(2)),
      actualizadoEn: cart.actualizadoEn,
    };
  }
}
