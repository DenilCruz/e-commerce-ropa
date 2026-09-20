import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewEntity } from './entities/review.entity';
import { CrearResenaDto } from './dto/crear-resena.dto';
import { ActualizarResenaDto } from './dto/actualizar-resena.dto';

@Injectable()
export class ResenasService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly repositorioResena: Repository<ReviewEntity>,
  ) {}

  async crear(datos: CrearResenaDto): Promise<ReviewEntity> {
    // Verificar si el usuario ya comentó este producto (para no tener spam de reseñas)
    const reseñaExistente = await this.repositorioResena.findOne({
      where: {
        usuarioId: datos.usuarioId,
        productoId: datos.productoId,
      },
    });

    if (reseñaExistente) {
      throw new BadRequestException('El usuario ya ha escrito una reseña para este producto. Puede actualizarla si lo desea.');
    }

    const nuevaResena = this.repositorioResena.create(datos);
    return await this.repositorioResena.save(nuevaResena);
  }

  async obtenerPorProducto(productoId: string): Promise<ReviewEntity[]> {
    return await this.repositorioResena.find({
      where: { productoId, aprobada: true }, // Solo mostramos reseñas aprobadas
      relations: ['usuario'], // Traemos los datos del usuario para mostrar su nombre y foto
      order: { creadoEn: 'DESC' },
    });
  }

  async obtenerResumenProducto(productoId: string): Promise<{ promedio: number; total: number }> {
    // Calculamos el promedio de estrellas de un producto
    const resultado = await this.repositorioResena
      .createQueryBuilder('resena')
      .select('AVG(resena.calificacion)', 'promedio')
      .addSelect('COUNT(resena.id)', 'total')
      .where('resena.producto_id = :productoId', { productoId })
      .andWhere('resena.aprobada = true')
      .getRawOne();

    return {
      promedio: parseFloat(resultado?.promedio || '0').toFixed(1) as unknown as number,
      total: parseInt(resultado?.total || '0', 10),
    };
  }

  async actualizar(id: string, datos: ActualizarResenaDto): Promise<ReviewEntity> {
    const resena = await this.repositorioResena.findOne({ where: { id } });
    if (!resena) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada.`);
    }

    Object.assign(resena, datos);
    return await this.repositorioResena.save(resena);
  }

  async eliminar(id: string): Promise<void> {
    const resena = await this.repositorioResena.findOne({ where: { id } });
    if (!resena) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada.`);
    }
    await this.repositorioResena.remove(resena);
  }
}
