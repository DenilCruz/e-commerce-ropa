import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { AjustarStockDto } from './dto/ajustar-stock.dto';
import { ItemStockDto } from './dto/item-stock.dto';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(ProductVariantEntity)
    private readonly repositorioVariante: Repository<ProductVariantEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * HU-35: Ver el stock actual por variante
   * Consulta todas las variantes con su producto, categoría, talla, color e imágenes
   */
  async obtenerTodasLasVariantes(busqueda?: string, estado?: string): Promise<any[]> {
    const qb = this.repositorioVariante
      .createQueryBuilder('variante')
      .leftJoinAndSelect('variante.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.imagenes', 'imagenes')
      .leftJoinAndSelect('variante.talla', 'talla')
      .leftJoinAndSelect('variante.color', 'color');

    // Filtro por término de búsqueda (nombre de prenda o SKU)
    if (busqueda && busqueda.trim() !== '') {
      const q = `%${busqueda.trim()}%`;
      qb.andWhere('(producto.nombre ILIKE :q OR variante.sku ILIKE :q)', { q });
    }

    // Filtro por estado de stock
    if (estado) {
      if (estado === 'agotado') {
        qb.andWhere('variante.stock = 0');
      } else if (estado === 'bajo') {
        qb.andWhere('variante.stock > 0 AND variante.stock <= variante.stock_minimo');
      } else if (estado === 'optimo') {
        qb.andWhere('variante.stock > variante.stock_minimo');
      } else if (estado === 'alerta') {
        qb.andWhere('variante.stock <= variante.stock_minimo');
      }
    }

    // Ordenar priorizando stock bajo/agotado primero, luego por nombre
    qb.orderBy('variante.stock', 'ASC').addOrderBy('producto.nombre', 'ASC');

    const variantes = await qb.getMany();

    // Mapear con datos calculados para facilitar la visualización en frontend
    return variantes.map(v => {
      let estadoStock: 'AGOTADO' | 'BAJO' | 'OPTIMO' = 'OPTIMO';
      if (v.stock === 0) {
        estadoStock = 'AGOTADO';
      } else if (v.stock <= v.stockMinimo) {
        estadoStock = 'BAJO';
      }

      return {
        ...v,
        estadoStock,
        diferenciaMinimo: v.stock - v.stockMinimo,
      };
    });
  }

  /**
   * HU-35 y HU-37: Obtener métricas globales (KPIs) de inventario
   */
  async obtenerKpis(): Promise<{
    totalVariantes: number;
    totalStock: number;
    stockBajo: number;
    agotados: number;
    stockOptimo: number;
  }> {
    const variantes = await this.repositorioVariante.find();

    let totalStock = 0;
    let stockBajo = 0;
    let agotados = 0;
    let stockOptimo = 0;

    for (const v of variantes) {
      const s = Number(v.stock) || 0;
      totalStock += s;
      if (s === 0) {
        agotados++;
      } else if (s <= (v.stockMinimo || 5)) {
        stockBajo++;
      } else {
        stockOptimo++;
      }
    }

    return {
      totalVariantes: variantes.length,
      totalStock,
      stockBajo,
      agotados,
      stockOptimo,
    };
  }

  /**
   * HU-37: Obtener reporte de alertas de stock bajo
   * Retorna variantes con stock menor o igual al mínimo
   */
  async obtenerAlertasDeStock(): Promise<ProductVariantEntity[]> {
    return await this.repositorioVariante
      .createQueryBuilder('variante')
      .leftJoinAndSelect('variante.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.imagenes', 'imagenes')
      .leftJoinAndSelect('variante.talla', 'talla')
      .leftJoinAndSelect('variante.color', 'color')
      .where('variante.stock <= variante.stock_minimo')
      .andWhere('variante.activa = true')
      .orderBy('variante.stock', 'ASC')
      .getMany();
  }

  /**
   * HU-36: Actualizar el stock cuando llega mercadería o ajuste manual
   */
  async ajustarStock(varianteId: string, datos: AjustarStockDto): Promise<ProductVariantEntity> {
    const variante = await this.repositorioVariante.findOne({
      where: { id: varianteId },
      relations: ['producto', 'talla', 'color'],
    });

    if (!variante) {
      throw new NotFoundException(`Variante de producto con ID ${varianteId} no encontrada.`);
    }

    let nuevoStock = variante.stock;

    if (datos.operacion === 'AGREGAR') {
      // Llegada de mercadería: suma al stock existente
      nuevoStock += datos.cantidad;
    } else if (datos.operacion === 'REDUCIR') {
      // Regla de Negocio: No permitir stock negativo
      if (variante.stock < datos.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para la variante "${variante.sku}". Se intentó reducir ${datos.cantidad}, pero solo hay ${variante.stock} disponibles.`
        );
      }
      nuevoStock -= datos.cantidad;
    } else if (datos.operacion === 'ESTABLECER') {
      // Ajuste directo
      nuevoStock = datos.cantidad;
    }

    variante.stock = nuevoStock;
    return await this.repositorioVariante.save(variante);
  }

  /**
   * HU-38: Descontar stock automáticamente al confirmar un pedido (Rol Sistema)
   * Valida suficiencia previa en todas las variantes y realiza el decremento de forma transaccional.
   */
  async descontarStock(items: ItemStockDto[]): Promise<{
    exito: boolean;
    mensaje: string;
    variantesActualizadas: { id: string; sku: string; stockAnterior: number; nuevoStock: number }[];
  }> {
    if (!items || items.length === 0) {
      throw new BadRequestException('La lista de ítems a descontar no puede estar vacía.');
    }

    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ProductVariantEntity);
      const variantesActualizadas = [];

      // 1. Fase de Validación: Verificar existencia y stock disponible de TODOS los ítems
      for (const item of items) {
        const variante = await repo.findOne({
          where: { id: item.varianteId },
          relations: ['producto'],
        });

        if (!variante) {
          throw new NotFoundException(`Variante con ID ${item.varianteId} no encontrada.`);
        }

        if (variante.stock < item.cantidad) {
          const nombreProd = variante.producto?.nombre || 'Producto';
          throw new BadRequestException(
            `Stock insuficiente para "${nombreProd}" (${variante.sku}). Solicitado: ${item.cantidad}, Disponible: ${variante.stock}.`
          );
        }
      }

      // 2. Fase de Ejecución: Aplicar los descuentos de inventario
      for (const item of items) {
        const variante = await repo.findOne({ where: { id: item.varianteId } });
        if (variante) {
          const stockAnterior = variante.stock;
          variante.stock -= item.cantidad;
          await repo.save(variante);

          variantesActualizadas.push({
            id: variante.id,
            sku: variante.sku,
            stockAnterior,
            nuevoStock: variante.stock,
          });
        }
      }

      return {
        exito: true,
        mensaje: `Stock descontado exitosamente para ${items.length} variante(s).`,
        variantesActualizadas,
      };
    });
  }

  /**
   * HU-39: Devolver stock si un pedido se cancela (Rol Sistema)
   * Restituye las unidades al almacén de forma transaccional.
   */
  async devolverStock(items: ItemStockDto[]): Promise<{
    exito: boolean;
    mensaje: string;
    variantesActualizadas: { id: string; sku: string; stockAnterior: number; nuevoStock: number }[];
  }> {
    if (!items || items.length === 0) {
      throw new BadRequestException('La lista de ítems a devolver no puede estar vacía.');
    }

    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ProductVariantEntity);
      const variantesActualizadas = [];

      for (const item of items) {
        const variante = await repo.findOne({ where: { id: item.varianteId } });
        if (!variante) {
          throw new NotFoundException(`Variante con ID ${item.varianteId} no encontrada.`);
        }

        const stockAnterior = variante.stock;
        variante.stock += item.cantidad;
        await repo.save(variante);

        variantesActualizadas.push({
          id: variante.id,
          sku: variante.sku,
          stockAnterior,
          nuevoStock: variante.stock,
        });
      }

      return {
        exito: true,
        mensaje: `Stock restituido exitosamente para ${items.length} variante(s).`,
        variantesActualizadas,
      };
    });
  }
}
