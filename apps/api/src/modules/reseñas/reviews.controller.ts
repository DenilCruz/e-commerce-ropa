import { Controller, Get, Post, Body, Param, Put, Delete, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ResenasService } from './reviews.service';
import { CrearResenaDto } from './dto/crear-resena.dto';
import { ActualizarResenaDto } from './dto/actualizar-resena.dto';

@ApiTags('Reseñas (Reviews)')
@Controller('resenas')
export class ResenasController {
  constructor(private readonly servicioResenas: ResenasService) {}

  @Post()
  @ApiOperation({ summary: 'Publicar una nueva reseña en un producto' })
  @ApiResponse({ status: 201, description: 'Reseña publicada exitosamente.' })
  @ApiResponse({ status: 400, description: 'El usuario ya reseñó este producto o datos inválidos.' })
  crear(@Body() datos: CrearResenaDto) {
    return this.servicioResenas.crear(datos);
  }

  @Get('producto/:productoId')
  @ApiOperation({ summary: 'Obtener todas las reseñas aprobadas de un producto' })
  @ApiParam({ name: 'productoId', description: 'ID del producto' })
  obtenerPorProducto(@Param('productoId', ParseUUIDPipe) productoId: string) {
    return this.servicioResenas.obtenerPorProducto(productoId);
  }

  @Get('producto/:productoId/resumen')
  @ApiOperation({ summary: 'Obtener el promedio de calificación y total de reseñas de un producto' })
  @ApiParam({ name: 'productoId', description: 'ID del producto' })
  obtenerResumenProducto(@Param('productoId', ParseUUIDPipe) productoId: string) {
    return this.servicioResenas.obtenerResumenProducto(productoId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una reseña existente' })
  @ApiParam({ name: 'id', description: 'ID de la reseña' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarResenaDto,
  ) {
    return this.servicioResenas.actualizar(id, datos);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una reseña' })
  @ApiParam({ name: 'id', description: 'ID de la reseña' })
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioResenas.eliminar(id);
  }
}
