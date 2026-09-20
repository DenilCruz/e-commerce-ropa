import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistEntity } from './entities/wishlist.entity';
import { AgregarFavoritoDto } from './dto/agregar-favorito.dto';

@Injectable()
export class FavoritosService {
  constructor(
    @InjectRepository(WishlistEntity)
    private readonly repositorioFavoritos: Repository<WishlistEntity>,
  ) {}

  async agregar(datos: AgregarFavoritoDto): Promise<WishlistEntity> {
    // Verificar si ya existe en favoritos para no duplicar
    const existe = await this.repositorioFavoritos.findOne({
      where: {
        usuarioId: datos.usuarioId,
        productoId: datos.productoId,
      },
    });

    if (existe) {
      throw new BadRequestException('El producto ya se encuentra en la lista de deseos del usuario.');
    }

    const nuevoFavorito = this.repositorioFavoritos.create(datos);
    return await this.repositorioFavoritos.save(nuevoFavorito);
  }

  async obtenerPorUsuario(usuarioId: string): Promise<WishlistEntity[]> {
    return await this.repositorioFavoritos.find({
      where: { usuarioId },
      relations: ['producto', 'producto.imagenes'], // Traemos el producto y sus imágenes para mostrarlos en el frontend
      order: { creadoEn: 'DESC' },
    });
  }

  async eliminar(usuarioId: string, productoId: string): Promise<void> {
    const favorito = await this.repositorioFavoritos.findOne({
      where: { usuarioId, productoId },
    });

    if (!favorito) {
      throw new NotFoundException('El producto no está en la lista de deseos.');
    }

    await this.repositorioFavoritos.remove(favorito);
  }
}
