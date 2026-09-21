import { Controller, Get, Put, Post, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InventarioService } from './inventory.service';
import { AjustarStockDto } from './dto/ajustar-stock.dto';
import { ProcesarStockPedidoDto } from './dto/item-stock.dto';

@ApiTags('Inventario y Almacén')
@Controller('inventario')
export class InventarioController {
  constructor(private readonly servicioInventario: InventarioService) {}

  @Get('variantes')
  @ApiOperation({ summary: 'HU-35: Ver el stock actual por variante de producto' })
  @ApiQuery({ name: 'busqueda', required: false, description: 'Búsqueda por nombre de prenda o SKU' })
  @ApiQuery({ name: 'estado', required: false, enum: ['todos', 'alerta', 'bajo', 'agotado', 'optimo'] })
  @ApiResponse({ status: 200, description: 'Lista de variantes y sus existencias retornada exitosamente.' })
  obtenerVariantes(
    @Query('busqueda') busqueda?: string,
    @Query('estado') estado?: string,
  ) {
    return this.servicioInventario.obtenerTodasLasVariantes(busqueda, estado);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Obtener métricas y estadísticas globales de inventario' })
  @ApiResponse({ status: 200, description: 'Métricas de inventario retornadas exitosamente.' })
  obtenerKpis() {
    return this.servicioInventario.obtenerKpis();
  }

  @Get('alertas')
  @ApiOperation({ summary: 'HU-37: Obtener reporte de productos con stock bajo o agotado' })
  @ApiResponse({ status: 200, description: 'Reporte de alertas generado exitosamente.' })
  obtenerAlertas() {
    return this.servicioInventario.obtenerAlertasDeStock();
  }

  @Put('variante/:varianteId/ajustar')
  @ApiOperation({ summary: 'HU-36: Actualizar stock cuando llega mercadería o por ajuste manual' })
  @ApiParam({ name: 'varianteId', description: 'ID (UUID) de la variante del producto' })
  @ApiResponse({ status: 200, description: 'Stock actualizado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Operación inválida o stock insuficiente para reducir.' })
  ajustarStock(
    @Param('varianteId', ParseUUIDPipe) varianteId: string,
    @Body() datos: AjustarStockDto,
  ) {
    return this.servicioInventario.ajustarStock(varianteId, datos);
  }

  @Post('descontar')
  @ApiOperation({ summary: 'HU-38: Descontar stock automáticamente al confirmar un pedido (Rol Sistema)' })
  @ApiResponse({ status: 200, description: 'Stock descontado de forma transaccional exitosamente.' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente en una o más variantes solicitadas.' })
  descontarStock(@Body() datos: ProcesarStockPedidoDto) {
    return this.servicioInventario.descontarStock(datos.items);
  }

  @Post('devolver')
  @ApiOperation({ summary: 'HU-39: Devolver stock al almacén si un pedido se cancela (Rol Sistema)' })
  @ApiResponse({ status: 200, description: 'Stock restituido exitosamente al almacén.' })
  devolverStock(@Body() datos: ProcesarStockPedidoDto) {
    return this.servicioInventario.devolverStock(datos.items);
  }
}
