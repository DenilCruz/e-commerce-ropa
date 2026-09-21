import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from './entities/product.entity';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { CrearColorDto } from './dto/crear-color.dto';
import { CategoriaEntity } from '../categorias/entities/category.entity';
import { SizeEntity } from './entities/size.entity';
import { ColorEntity } from './entities/color.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repositorioProducto: Repository<ProductEntity>,
    @InjectRepository(SizeEntity) private readonly repositorioTalla: Repository<SizeEntity>,
    @InjectRepository(ColorEntity) private readonly repositorioColor: Repository<ColorEntity>,
  ) {}

  async crear(datos: CrearProductoDto): Promise<ProductEntity> {
    // TypeORM automáticamente insertará las variantes y las imágenes gracias a { cascade: true }
    // en la entidad si vienen incluidas en el DTO.
    const nuevoProducto = this.repositorioProducto.create(datos);
    return await this.repositorioProducto.save(nuevoProducto);
  }

  
  async obtenerTallas(): Promise<SizeEntity[]> {
    return await this.repositorioTalla.find();
  }

  
  async crearColor(datos: CrearColorDto): Promise<ColorEntity> {
    const nuevo = this.repositorioColor.create(datos);
    return await this.repositorioColor.save(nuevo);
  }

  async obtenerColores(): Promise<ColorEntity[]> {
    return await this.repositorioColor.find();
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

  async obtenerRelacionados(id: string): Promise<ProductEntity[]> {
    const producto = await this.obtenerPorId(id);
    const productos = await this.repositorioProducto.find({
      where: {
        categoriaId: producto.categoriaId,
        activo: true,
      },
      relations: ['categoria', 'marca', 'variantes', 'variantes.talla', 'variantes.color', 'imagenes'],
      take: 5,
    });
    return productos.filter(p => p.id !== id).slice(0, 4);
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

  async toggleActivo(id: string): Promise<ProductEntity> {
    const producto = await this.obtenerPorId(id);
    producto.activo = !producto.activo;
    return await this.repositorioProducto.save(producto);
  }

  async eliminarFisicamente(id: string): Promise<void> {
    const producto = await this.obtenerPorId(id);
    await this.repositorioProducto.remove(producto);
  }
}
