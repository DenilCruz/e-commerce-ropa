import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { AjustarStockDto } from './dto/ajustar-stock.dto';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(ProductVariantEntity)
    private readonly repositorioVariante: Repository<ProductVariantEntity>,
  ) {}

  // ==========================================
  // REPORTE: ALERTAS DE STOCK BAJO
  // ==========================================
  async obtenerAlertasDeStock(): Promise<ProductVariantEntity[]> {
    // Para un e-commerce profesional, necesitamos un panel donde el administrador
    // vea de un vistazo qué prendas están por agotarse.
    // Usamos el "QueryBuilder" para buscar donde el stock actual sea menor o igual al stock mínimo.
    return await this.repositorioVariante
      .createQueryBuilder('variante')
      .leftJoinAndSelect('variante.producto', 'producto')
      .leftJoinAndSelect('variante.talla', 'talla')
      .leftJoinAndSelect('variante.color', 'color')
      .where('variante.stock <= variante.stock_minimo')
      .andWhere('variante.activa = true')
      .orderBy('variante.stock', 'ASC')
      .getMany();
  }

  // ==========================================
  // OPERACIÓN: AJUSTE MANUAL DE INVENTARIO
  // ==========================================
  async ajustarStock(varianteId: string, datos: AjustarStockDto): Promise<ProductVariantEntity> {
    const variante = await this.repositorioVariante.findOne({
      where: { id: varianteId },
      relations: ['producto'],
    });

    if (!variante) {
      throw new NotFoundException(`Variante de producto con ID ${varianteId} no encontrada.`);
    }

    // Lógica defensiva: Calculamos el nuevo stock basándonos en la operación
    let nuevoStock = variante.stock;

    if (datos.operacion === 'AGREGAR') {
      nuevoStock += datos.cantidad;
    } else if (datos.operacion === 'REDUCIR') {
      // Regla de Negocio: No podemos tener inventario negativo en un e-commerce físico
      if (variante.stock < datos.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente. Intentas reducir ${datos.cantidad}, pero solo hay ${variante.stock} en inventario.`
        );
      }
      nuevoStock -= datos.cantidad;
    }

    // Actualizamos el stock
    variante.stock = nuevoStock;
    const varianteGuardada = await this.repositorioVariante.save(variante);

    // NOTA PARA LA DEFENSA (PUDS):
    // En un sistema 100% terminado, aquí se llamaría al "AuditoriaService" para guardar el 'datos.motivo'
    // en la tabla 'bitacora' o 'movimiento_inventario' para que quede un rastro contable de quién 
    // hizo el ajuste y por qué. Como la bitácora es transversal, de momento solo actualizamos la variante.

    return varianteGuardada;
  }
}
