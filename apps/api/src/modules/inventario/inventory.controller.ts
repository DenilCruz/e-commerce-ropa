import { Controller, Get, Put, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InventarioService } from './inventory.service';
import { AjustarStockDto } from './dto/ajustar-stock.dto';

@ApiTags('Inventario y Almacén')
@Controller('inventario')
export class InventarioController {
  constructor(private readonly servicioInventario: InventarioService) {}

  @Get('alertas')
  @ApiOperation({ summary: 'Obtener un reporte de todos los productos que tienen stock bajo o nulo' })
  @ApiResponse({ status: 200, description: 'Reporte de alertas generado exitosamente.' })
  obtenerAlertas() {
    return this.servicioInventario.obtenerAlertasDeStock();
  }

  @Put('variante/:varianteId/ajustar')
  @ApiOperation({ summary: 'Ajustar manualmente el stock de una variante específica (por pérdida, ingreso, etc.)' })
  @ApiParam({ name: 'varianteId', description: 'ID de la variante del producto' })
  @ApiResponse({ status: 200, description: 'Stock actualizado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Operación inválida o stock insuficiente para reducir.' })
  ajustarStock(
    @Param('varianteId', ParseUUIDPipe) varianteId: string,
    @Body() datos: AjustarStockDto,
  ) {
    return this.servicioInventario.ajustarStock(varianteId, datos);
  }
}
