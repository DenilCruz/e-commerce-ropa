import { Controller, Get, Post, Body, Param, Put, Delete, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductosService } from './products.service';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';

@ApiTags('Productos')
@Controller('productos')
export class ProductosController {
  constructor(private readonly servicioProductos: ProductosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo producto junto con sus variantes e imágenes' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente.' })
  crear(@Body() datos: CrearProductoDto) {
    return this.servicioProductos.crear(datos);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener el catálogo completo de productos con sus relaciones' })
  @ApiResponse({ status: 200, description: 'Catálogo retornado exitosamente.' })
  obtenerTodos() {
    return this.servicioProductos.obtenerTodos();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de un producto específico' })
  @ApiParam({ name: 'id', description: 'ID (UUID) del producto' })
  @ApiResponse({ status: 200, description: 'Producto encontrado.' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado.' })
  obtenerPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioProductos.obtenerPorId(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar los datos de un producto' })
  @ApiParam({ name: 'id', description: 'ID (UUID) del producto' })
  @ApiResponse({ status: 200, description: 'Producto actualizado exitosamente.' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarProductoDto,
  ) {
    return this.servicioProductos.actualizar(id, datos);
  }

  @Delete(':id/desactivar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dar de baja (desactivar) un producto del catálogo sin borrarlo' })
  @ApiParam({ name: 'id', description: 'ID (UUID) del producto' })
  desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioProductos.desactivar(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un producto definitivamente de la base de datos' })
  @ApiParam({ name: 'id', description: 'ID (UUID) del producto' })
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioProductos.eliminarFisicamente(id);
  }
}
