import { Controller, Get, Post, Body, Param, Put, Delete, HttpCode, HttpStatus, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriasService } from './categories.service';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../autenticacion/guards/roles.guard';
import { Roles } from '../autenticacion/decorators/roles.decorator';

@ApiTags('Categorias')
@Controller(['categorias', 'catalogo/categorias'])
export class CategoriasController {
  constructor(private readonly servicioCategorias: CategoriasService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'HU-30: Crear una nueva categoría o subcategoría' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente.' })
  crear(@Body() datos: CrearCategoriaDto) {
    return this.servicioCategorias.crear(datos);
  }

  @Get()
  @ApiOperation({ summary: 'HU-33: Obtener todas las categorías principales con sus subcategorías en árbol' })
  @ApiResponse({ status: 200, description: 'Árbol de categorías retornado exitosamente.' })
  obtenerTodas() {
    return this.servicioCategorias.obtenerTodas();
  }

  @Get('plano')
  @ApiOperation({ summary: 'Obtener listado plano de todas las categorías con conteo de productos' })
  @ApiResponse({ status: 200, description: 'Listado plano de categorías retornado exitosamente.' })
  obtenerPlano() {
    return this.servicioCategorias.obtenerPlano();
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'HU-31: Actualizar los datos (nombre, imagen, etc.) de una categoría' })
  @ApiParam({ name: 'id', description: 'ID (UUID) de la categoría' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada exitosamente.' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarCategoriaDto,
  ) {
    return this.servicioCategorias.actualizar(id, datos);
  }

  @Put(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alternar estado activo/inactivo de una categoría' })
  @ApiParam({ name: 'id', description: 'ID (UUID) de la categoría' })
  @ApiResponse({ status: 200, description: 'Estado alternado exitosamente.' })
  toggleActivo(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioCategorias.toggleActivo(id);
  }

  @Delete(':id/desactivar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar lógicamente una categoría sin borrarla de la base de datos' })
  @ApiParam({ name: 'id', description: 'ID (UUID) de la categoría' })
  desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioCategorias.desactivar(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'HU-32: Eliminar físicamente una categoría vacía (sin productos ni subcategorías)' })
  @ApiParam({ name: 'id', description: 'ID (UUID) de la categoría' })
  @ApiResponse({ status: 204, description: 'Categoría eliminada exitosamente.' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar porque contiene productos o subcategorías.' })
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioCategorias.eliminarFisicamente(id);
  }
}
