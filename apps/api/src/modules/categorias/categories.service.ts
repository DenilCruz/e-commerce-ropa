import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaEntity } from './entities/category.entity';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(CategoriaEntity)
    private readonly repositorioCategoria: Repository<CategoriaEntity>,
  ) {}

  async crear(datos: CrearCategoriaDto): Promise<CategoriaEntity> {
    // Si envían un padre_id, verificamos que la categoría padre exista
    if (datos.padre_id) {
      const padreExiste = await this.repositorioCategoria.findOne({ where: { id: datos.padre_id } });
      if (!padreExiste) {
        throw new BadRequestException(`La categoría padre con ID ${datos.padre_id} no existe.`);
      }
    }

    const nuevaCategoria = this.repositorioCategoria.create(datos);
    return await this.repositorioCategoria.save(nuevaCategoria);
  }

  async obtenerTodas(): Promise<CategoriaEntity[]> {
    // Obtenemos todas las categorías principales (las que no tienen padre)
    // y traemos sus subcategorías anidadas.
    return await this.repositorioCategoria.find({
      where: { padre_id: null },
      relations: ['subcategorias'],
      order: { orden: 'ASC' }
    });
  }

  async obtenerPorId(id: string): Promise<CategoriaEntity> {
    const categoria = await this.repositorioCategoria.findOne({
      where: { id },
      relations: ['subcategorias', 'padre'],
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada.`);
    }
    return categoria;
  }

  async actualizar(id: string, datos: ActualizarCategoriaDto): Promise<CategoriaEntity> {
    const categoria = await this.obtenerPorId(id); // Verifica si existe

    // Evitar que una categoría sea su propio padre (bucle infinito)
    if (datos.padre_id === id) {
      throw new BadRequestException('Una categoría no puede ser su propia categoría padre.');
    }

    Object.assign(categoria, datos);
    return await this.repositorioCategoria.save(categoria);
  }

  async desactivar(id: string): Promise<CategoriaEntity> {
    // En lugar de hacer DELETE físico (que rompería productos), hacemos borrado lógico desactivándola
    const categoria = await this.obtenerPorId(id);
    categoria.activa = false;
    return await this.repositorioCategoria.save(categoria);
  }

  async eliminarFisicamente(id: string): Promise<void> {
    const categoria = await this.obtenerPorId(id);
    await this.repositorioCategoria.remove(categoria);
  }
}
