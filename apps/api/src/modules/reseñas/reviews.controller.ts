import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpCode, 
  HttpStatus, 
  ParseUUIDPipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ResenasService } from './reviews.service';
import { CrearResenaDto } from './dto/crear-resena.dto';
import { ActualizarResenaDto } from './dto/actualizar-resena.dto';
import { EstadoCompraResenaDto } from './dto/verificar-compra.dto';

@ApiTags('Reseñas y Calificaciones (Reviews)')
@Controller('resenas')
export class ResenasController {
  constructor(private readonly servicioResenas: ResenasService) {}

  @Post()
  @ApiOperation({ summary: 'HU-66: Publicar reseña (requiere haber comprado el producto)' })
  @ApiResponse({ status: 201, description: 'Reseña publicada exitosamente.' })
  @ApiResponse({ status: 403, description: 'Prohibido: El usuario no ha comprado este producto.' })
  crear(@Body() datos: CrearResenaDto) {
    return this.servicioResenas.crear(datos);
  }

  @Get('verificar-compra/:productoId/:usuarioId')
  @ApiOperation({ summary: 'HU-66: Verificar si el usuario compró el producto y si ya dejó reseña' })
  @ApiParam({ name: 'productoId', description: 'ID del producto' })
  @ApiParam({ name: 'usuarioId', description: 'ID del usuario' })
  @ApiResponse({ status: 200, type: EstadoCompraResenaDto })
  verificarCompra(
    @Param('productoId', ParseUUIDPipe) productoId: string,
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
  ): Promise<EstadoCompraResenaDto> {
    return this.servicioResenas.verificarCompraCliente(productoId, usuarioId);
  }

  @Post('simular-compra')
  @ApiOperation({ summary: 'HU-66: Registrar compra de prueba (para facilitar evaluación académica)' })
  simularCompra(@Body() body: { productoId: string; usuarioId: string }) {
    return this.servicioResenas.simularCompraParaPruebas(body.productoId, body.usuarioId);
  }

  @Get('producto/:productoId')
  @ApiOperation({ summary: 'HU-67: Obtener todas las reseñas aprobadas de un producto' })
  @ApiParam({ name: 'productoId', description: 'ID del producto' })
  obtenerPorProducto(@Param('productoId', ParseUUIDPipe) productoId: string) {
    return this.servicioResenas.obtenerPorProducto(productoId);
  }

  @Get('producto/:productoId/resumen')
  @ApiOperation({ summary: 'HU-70: Obtener promedio de estrellas y desglose de un producto' })
  @ApiParam({ name: 'productoId', description: 'ID del producto' })
  obtenerResumenProducto(@Param('productoId', ParseUUIDPipe) productoId: string) {
    return this.servicioResenas.obtenerResumenProducto(productoId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'HU-68: Editar la propia reseña del cliente' })
  @ApiParam({ name: 'id', description: 'ID de la reseña' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarResenaDto,
  ) {
    return this.servicioResenas.actualizar(id, datos, datos.usuarioId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'HU-68: Eliminar la propia reseña del cliente' })
  @ApiParam({ name: 'id', description: 'ID de la reseña' })
  @ApiQuery({ name: 'usuarioId', required: false, description: 'ID del usuario para verificar autoría' })
  eliminar(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('usuarioId') usuarioId?: string,
  ) {
    return this.servicioResenas.eliminar(id, usuarioId, false);
  }

  // --- Endpoints Administrativos de Moderación (HU-69) ---

  @Get('admin/kpis')
  @ApiOperation({ summary: 'HU-69: Obtener KPIs de moderación de reseñas para el panel admin' })
  obtenerKpisAdmin() {
    return this.servicioResenas.obtenerKpisAdmin();
  }

  @Get('admin/todas')
  @ApiOperation({ summary: 'HU-69: Listar todas las reseñas con filtros de moderación' })
  @ApiQuery({ name: 'busqueda', required: false })
  @ApiQuery({ name: 'estado', required: false, enum: ['todas', 'aprobadas', 'ocultas'] })
  obtenerTodasAdmin(
    @Query('busqueda') busqueda?: string,
    @Query('estado') estado?: 'todas' | 'aprobadas' | 'ocultas',
  ) {
    return this.servicioResenas.obtenerTodasAdmin(busqueda, estado);
  }

  @Put('admin/:id/moderar')
  @ApiOperation({ summary: 'HU-69: Alternar visibilidad de reseña (ocultar spam / activar)' })
  @ApiParam({ name: 'id', description: 'ID de la reseña' })
  moderarResena(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioResenas.toggleAprobada(id);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'HU-69: Eliminar permanentemente una reseña ofensiva o spam' })
  @ApiParam({ name: 'id', description: 'ID de la reseña' })
  eliminarAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioResenas.eliminar(id, undefined, true);
  }
}
