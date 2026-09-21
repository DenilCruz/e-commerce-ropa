import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistEntity } from './entities/wishlist.entity';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { CartService } from '../carrito/cart.service';
import { AgregarFavoritoDto } from './dto/agregar-favorito.dto';
import { MoverFavoritoAlCarritoDto } from './dto/mover-favorito-carrito.dto';

@Injectable()
export class FavoritosService {
  constructor(
    @InjectRepository(WishlistEntity)
    private readonly repositorioFavoritos: Repository<WishlistEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly repositorioVariantes: Repository<ProductVariantEntity>,
    private readonly cartService: CartService,
  ) {}

  /**
   * HU-76: Guardar un producto en la lista de favoritos del cliente
   */
  async agregar(datos: AgregarFavoritoDto): Promise<WishlistEntity> {
    // Verificar si ya existe en favoritos para prevenir duplicados
    const existe = await this.repositorioFavoritos.findOne({
      where: {
        usuarioId: datos.usuarioId,
        productoId: datos.productoId,
      },
    });

    if (existe) {
      throw new BadRequestException('El producto ya se encuentra en tu lista de favoritos.');
    }

    const nuevoFavorito = this.repositorioFavoritos.create(datos);
    return await this.repositorioFavoritos.save(nuevoFavorito);
  }

  /**
   * HU-77: Obtener la lista de favoritos completa del cliente con imágenes, categorías y variantes
   */
  async obtenerPorUsuario(usuarioId: string): Promise<WishlistEntity[]> {
    return await this.repositorioFavoritos.find({
      where: { usuarioId },
      relations: [
        'producto',
        'producto.imagenes',
        'producto.categoria',
        'producto.variantes',
        'producto.variantes.talla',
        'producto.variantes.color',
      ],
      order: { creadoEn: 'DESC' },
    });
  }

  /**
   * HU-78: Quitar un producto puntual de favoritos
   */
  async eliminar(usuarioId: string, productoId: string): Promise<{ mensaje: string }> {
    const favorito = await this.repositorioFavoritos.findOne({
      where: { usuarioId, productoId },
    });

    if (!favorito) {
      throw new NotFoundException('El producto no está en tu lista de favoritos.');
    }

    await this.repositorioFavoritos.remove(favorito);
    return { mensaje: 'Producto eliminado de favoritos exitosamente.' };
  }

  /**
   * Vaciar toda la lista de favoritos del usuario
   */
  async limpiarTodos(usuarioId: string): Promise<{ eliminados: number; mensaje: string }> {
    const favoritos = await this.repositorioFavoritos.find({
      where: { usuarioId },
    });

    if (favoritos.length === 0) {
      return { eliminados: 0, mensaje: 'No hay favoritos para eliminar.' };
    }

    await this.repositorioFavoritos.remove(favoritos);
    return {
      eliminados: favoritos.length,
      mensaje: `${favoritos.length} ${favoritos.length === 1 ? 'producto eliminado' : 'productos eliminados'} de favoritos.`,
    };
  }

  /**
   * HU-79: Pasar un producto favorito directamente al carrito de compras
   */
  async moverAlCarrito(datos: MoverFavoritoAlCarritoDto): Promise<{
    exito: boolean;
    mensaje: string;
    varianteId: string;
    carrito: any;
  }> {
    // 1. Verificar existencia en la lista de favoritos
    const favorito = await this.repositorioFavoritos.findOne({
      where: { usuarioId: datos.usuarioId, productoId: datos.productoId },
      relations: ['producto'],
    });

    if (!favorito) {
      throw new NotFoundException('El producto no se encuentra en tu lista de favoritos.');
    }

    // 2. Determinar la variante específica (talla/color)
    let targetVarianteId = datos.varianteId;
    if (!targetVarianteId) {
      // Buscar primera variante activa con stock disponible
      const varianteDisponible = await this.repositorioVariantes.findOne({
        where: {
          productoId: datos.productoId,
          activa: true,
        },
        order: { stock: 'DESC' },
      });

      if (!varianteDisponible || varianteDisponible.stock <= 0) {
        throw new BadRequestException(
          'El producto no cuenta con variantes disponibles en stock actualmente.',
        );
      }
      targetVarianteId = varianteDisponible.id;
    }

    // 3. Invocar al servicio del carrito validando stock y reglas de negocio (HU-40 / HU-46)
    const resultadoCarrito = await this.cartService.agregarItem(datos.usuarioId, {
      varianteId: targetVarianteId,
      cantidad: datos.cantidad || 1,
    });

    // 4. Si se configuró eliminar de favoritos (por defecto true), removerlo de la lista
    if (datos.eliminarDeFavoritos !== false) {
      await this.repositorioFavoritos.remove(favorito);
    }

    return {
      exito: true,
      mensaje: 'Producto movido al carrito exitosamente.',
      varianteId: targetVarianteId,
      carrito: resultadoCarrito,
    };
  }
}
