import { Controller, Get, Post, Body, Param, Put, Delete, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CategoriasService } from './categories.service';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';

@ApiTags('Categorias')
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly servicioCategorias: CategoriasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente.' })
  crear(@Body() datos: CrearCategoriaDto) {
    return this.servicioCategorias.crear(datos);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las categorías principales con sus subcategorías' })
  @ApiResponse({ status: 200, description: 'Lista de categorías retornada exitosamente.' })
  obtenerTodas() {
    return this.servicioCategorias.obtenerTodas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoría específica por su ID' })
  @ApiParam({ name: 'id', description: 'ID (UUID) de la categoría' })
  @ApiResponse({ status: 200, description: 'Categoría encontrada.' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada.' })
  obtenerPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioCategorias.obtenerPorId(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar los datos de una categoría' })
  @ApiParam({ name: 'id', description: 'ID (UUID) de la categoría' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada exitosamente.' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarCategoriaDto,
  ) {
    return this.servicioCategorias.actualizar(id, datos);
  }

  @Delete(':id/desactivar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar lógicamente una categoría sin borrarla de la base de datos' })
  @ApiParam({ name: 'id', description: 'ID (UUID) de la categoría' })
  desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioCategorias.desactivar(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar físicamente una categoría de la base de datos' })
  @ApiParam({ name: 'id', description: 'ID (UUID) de la categoría' })
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioCategorias.eliminarFisicamente(id);
  }
}
