import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from './entities/product.entity';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { CategoriaEntity } from '../categorias/entities/category.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repositorioProducto: Repository<ProductEntity>,
  ) {}

  async crear(datos: CrearProductoDto): Promise<ProductEntity> {
    // TypeORM automáticamente insertará las variantes y las imágenes gracias a { cascade: true }
    // en la entidad si vienen incluidas en el DTO.
    const nuevoProducto = this.repositorioProducto.create(datos);
    return await this.repositorioProducto.save(nuevoProducto);
  }

  async obtenerTodos(): Promise<ProductEntity[]> {
    return await this.repositorioProducto.find({
      relations: ['categoria', 'marca', 'variantes', 'variantes.talla', 'variantes.color', 'imagenes'],
      order: { creadoEn: 'DESC' }
    });
  }

  async obtenerPorId(id: string): Promise<ProductEntity> {
    const producto = await this.repositorioProducto.findOne({
      where: { id },
      relations: ['categoria', 'marca', 'variantes', 'variantes.talla', 'variantes.color', 'imagenes'],
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado.`);
    }
    return producto;
  }

  async actualizar(id: string, datos: ActualizarProductoDto): Promise<ProductEntity> {
    const producto = await this.obtenerPorId(id); // Verificamos si existe

    // Actualizamos los datos
    const productoActualizado = this.repositorioProducto.merge(producto, datos);
    return await this.repositorioProducto.save(productoActualizado);
  }

  async desactivar(id: string): Promise<ProductEntity> {
    const producto = await this.obtenerPorId(id);
    producto.activo = false;
    return await this.repositorioProducto.save(producto);
  }

  async eliminarFisicamente(id: string): Promise<void> {
    const producto = await this.obtenerPorId(id);
    await this.repositorioProducto.remove(producto);
  }
}
