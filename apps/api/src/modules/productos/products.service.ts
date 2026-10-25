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
import { BrandEntity } from './entities/brand.entity';

import { TenantContext } from '../../common/tenant/tenant-context';

@Injectable()
export class ProductosService {
  private get tid(): string {
    return TenantContext.require();
  }

  constructor(
    @InjectRepository(ProductEntity)
    private readonly repositorioProducto: Repository<ProductEntity>,
    @InjectRepository(SizeEntity) private readonly repositorioTalla: Repository<SizeEntity>,
    @InjectRepository(ColorEntity) private readonly repositorioColor: Repository<ColorEntity>,
    @InjectRepository(CategoriaEntity) private readonly repositorioCategoria: Repository<CategoriaEntity>,
    @InjectRepository(BrandEntity) private readonly repositorioMarca: Repository<BrandEntity>,
  ) {}

  /** Foreign keys ignore row-level security, so category and brand must be checked against the active store. */
  private async validarReferencias(categoriaId?: string, marcaId?: string): Promise<void> {
    if (categoriaId && !(await this.repositorioCategoria.count({ where: { id: categoriaId, tenantId: this.tid } }))) {
      throw new BadRequestException('La categoría indicada no existe en esta tienda.');
    }
    if (marcaId && !(await this.repositorioMarca.count({ where: { id: marcaId, tenantId: this.tid } }))) {
      throw new BadRequestException('La marca indicada no existe en esta tienda.');
    }
  }

  async crear(datos: CrearProductoDto): Promise<ProductEntity> {
    await this.validarReferencias(datos.categoriaId, datos.marcaId);
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

  async obtenerTodos(categoriaId?: string, busqueda?: string, ordenarPor?: string): Promise<ProductEntity[]> {
    const qb = this.repositorioProducto.createQueryBuilder('producto')
      .where('producto.tenantId = :tid', { tid: this.tid })
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.marca', 'marca')
      .leftJoinAndSelect('producto.variantes', 'variantes')
      .leftJoinAndSelect('variantes.talla', 'talla')
      .leftJoinAndSelect('variantes.color', 'color')
      .leftJoinAndSelect('producto.imagenes', 'imagenes');

    if (categoriaId && categoriaId !== 'todas') {
      qb.andWhere('(producto.categoriaId = :categoriaId OR categoria.padre_id = :categoriaId)', { categoriaId });
    }

    if (busqueda && busqueda.trim()) {
      qb.andWhere('(LOWER(producto.nombre) LIKE LOWER(:busqueda) OR LOWER(producto.descripcion) LIKE LOWER(:busqueda))', {
        busqueda: `%${busqueda.trim()}%`,
      });
    }

    if (ordenarPor === 'precio_asc') {
      qb.orderBy('producto.precio', 'ASC');
    } else if (ordenarPor === 'precio_desc') {
      qb.orderBy('producto.precio', 'DESC');
    } else {
      qb.orderBy('producto.creadoEn', 'DESC');
    }

    return await qb.getMany();
  }

  async obtenerPorId(id: string): Promise<ProductEntity> {
    const producto = await this.repositorioProducto.findOne({
      where: { id, tenantId: this.tid },
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
        tenantId: this.tid,
      },
      relations: ['categoria', 'marca', 'variantes', 'variantes.talla', 'variantes.color', 'imagenes'],
      take: 5,
    });
    return productos.filter(p => p.id !== id).slice(0, 4);
  }

  async actualizar(id: string, datos: ActualizarProductoDto): Promise<ProductEntity> {
    const producto = await this.obtenerPorId(id); // Verificamos si existe
    await this.validarReferencias(datos.categoriaId, datos.marcaId);

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
