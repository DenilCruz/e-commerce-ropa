import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CategoriaEntity } from './entities/category.entity';
import { ProductEntity } from '../productos/entities/product.entity';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(CategoriaEntity)
    private readonly repositorioCategoria: Repository<CategoriaEntity>,
    @InjectRepository(ProductEntity)
    private readonly repositorioProducto: Repository<ProductEntity>,
  ) {}

  /**
   * HU-30: Crear categorías y subcategorías
   */
  async crear(datos: CrearCategoriaDto): Promise<CategoriaEntity> {
    const payload: Partial<CategoriaEntity> = {
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion?.trim() || null,
      activa: datos.activa !== undefined ? datos.activa : true,
      orden: datos.orden !== undefined ? datos.orden : 0,
      imagen: datos.imagen?.trim() || null,
      padre_id: datos.padre_id && datos.padre_id.trim() !== '' ? datos.padre_id : null,
    };

    // Si envían un padre_id, verificamos que la categoría padre exista
    if (payload.padre_id) {
      const padreExiste = await this.repositorioCategoria.findOne({ where: { id: payload.padre_id } });
      if (!padreExiste) {
        throw new BadRequestException(`La categoría padre con ID ${payload.padre_id} no existe.`);
      }
    }

    const nuevaCategoria = this.repositorioCategoria.create(payload);
    return await this.repositorioCategoria.save(nuevaCategoria);
  }

  /**
   * HU-33: Obtener árbol de categorías (padres con sus subcategorías anidadas y conteo de productos)
   */
  async obtenerTodas(): Promise<any[]> {
    const categorias = await this.repositorioCategoria.find({
      where: { padre_id: IsNull() },
      relations: ['subcategorias'],
      order: { orden: 'ASC', nombre: 'ASC' },
    });

    // Enriquecer con conteo de productos
    const categoriasConConteo = await Promise.all(
      categorias.map(async (cat) => {
        const directProductos = await this.repositorioProducto.count({ where: { categoriaId: cat.id } });
        
        let subcatsEnriquecidas: any[] = [];
        if (cat.subcategorias && cat.subcategorias.length > 0) {
          subcatsEnriquecidas = await Promise.all(
            cat.subcategorias.map(async (sub) => {
              const subProds = await this.repositorioProducto.count({ where: { categoriaId: sub.id } });
              return {
                ...sub,
                totalProductos: subProds,
              };
            })
          );
        }

        const totalSubProds = subcatsEnriquecidas.reduce((acc, curr) => acc + curr.totalProductos, 0);

        return {
          ...cat,
          subcategorias: subcatsEnriquecidas,
          totalProductosDirectos: directProductos,
          totalProductos: directProductos + totalSubProds,
        };
      })
    );

    return categoriasConConteo;
  }

  /**
   * Obtener lista plana de todas las categorías (útil para administración y selectores)
   */
  async obtenerPlano(): Promise<any[]> {
    const categorias = await this.repositorioCategoria.find({
      relations: ['padre'],
      order: { orden: 'ASC', nombre: 'ASC' },
    });

    const resultado = await Promise.all(
      categorias.map(async (cat) => {
        const directProductos = await this.repositorioProducto.count({ where: { categoriaId: cat.id } });
        const subcategoriasCount = await this.repositorioCategoria.count({ where: { padre_id: cat.id } });
        return {
          ...cat,
          totalProductos: directProductos,
          totalSubcategorias: subcategoriasCount,
          esVacia: directProductos === 0 && subcategoriasCount === 0,
        };
      })
    );

    return resultado;
  }

  /**
   * Obtener una categoría específica por su ID
   */
  async obtenerPorId(id: string): Promise<any> {
    const categoria = await this.repositorioCategoria.findOne({
      where: { id },
      relations: ['subcategorias', 'padre'],
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada.`);
    }

    const totalProductos = await this.repositorioProducto.count({ where: { categoriaId: id } });
    return {
      ...categoria,
      totalProductos,
    };
  }

  /**
   * HU-31: Editar el nombre o imagen de una categoría (y otros atributos)
   */
  async actualizar(id: string, datos: ActualizarCategoriaDto): Promise<CategoriaEntity> {
    const categoria = await this.repositorioCategoria.findOne({ where: { id } });
    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada.`);
    }

    // Evitar bucle infinito si se asigna a sí misma como padre
    if (datos.padre_id && datos.padre_id === id) {
      throw new BadRequestException('Una categoría no puede ser su propia categoría padre.');
    }

    if (datos.padre_id && datos.padre_id.trim() !== '') {
      const padre = await this.repositorioCategoria.findOne({ where: { id: datos.padre_id } });
      if (!padre) {
        throw new BadRequestException(`La categoría padre con ID ${datos.padre_id} no existe.`);
      }
      // Evitar ciclos de 2 niveles: el padre no puede tener como padre a la categoría actual
      if (padre.padre_id === id) {
        throw new BadRequestException('Relación circular no permitida entre categoría y subcategoría.');
      }
      categoria.padre_id = datos.padre_id;
    } else if (datos.padre_id === '' || datos.padre_id === null) {
      categoria.padre_id = null;
    }

    if (datos.nombre !== undefined) categoria.nombre = datos.nombre.trim();
    if (datos.descripcion !== undefined) categoria.descripcion = datos.descripcion?.trim() || null;
    if (datos.imagen !== undefined) categoria.imagen = datos.imagen?.trim() || null;
    if (datos.activa !== undefined) categoria.activa = datos.activa;
    if (datos.orden !== undefined) categoria.orden = datos.orden;

    return await this.repositorioCategoria.save(categoria);
  }

  /**
   * Alternar estado activo / inactivo
   */
  async toggleActivo(id: string): Promise<CategoriaEntity> {
    const categoria = await this.repositorioCategoria.findOne({ where: { id } });
    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada.`);
    }
    categoria.activa = !categoria.activa;
    return await this.repositorioCategoria.save(categoria);
  }

  /**
   * Desactivar lógicamente
   */
  async desactivar(id: string): Promise<CategoriaEntity> {
    const categoria = await this.repositorioCategoria.findOne({ where: { id } });
    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada.`);
    }
    categoria.activa = false;
    return await this.repositorioCategoria.save(categoria);
  }

  /**
   * HU-32: Eliminar categorías vacías
   * Valida estrictamente que la categoría no contenga productos asignados ni subcategorías
   */
  async eliminarFisicamente(id: string): Promise<void> {
    const categoria = await this.repositorioCategoria.findOne({ where: { id } });
    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada.`);
    }

    // 1. Validar productos asignados
    const totalProductos = await this.repositorioProducto.count({ where: { categoriaId: id } });
    if (totalProductos > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría "${categoria.nombre}" porque contiene ${totalProductos} producto(s) asignado(s). Primero reasigne o elimine los productos.`
      );
    }

    // 2. Validar subcategorías hijas
    const totalSubcategorias = await this.repositorioCategoria.count({ where: { padre_id: id } });
    if (totalSubcategorias > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría "${categoria.nombre}" porque tiene ${totalSubcategorias} subcategoría(s) asociada(s). Primero elimine o reasigne sus subcategorías.`
      );
    }

    // Si está completamente vacía, eliminar físicamente
    await this.repositorioCategoria.remove(categoria);
  }
}
