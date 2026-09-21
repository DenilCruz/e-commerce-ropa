import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FavoritosService } from './wishlist.service';
import { AgregarFavoritoDto } from './dto/agregar-favorito.dto';
import { MoverFavoritoAlCarritoDto } from './dto/mover-favorito-carrito.dto';

@ApiTags('Favoritos (Lista de Deseos)')
@Controller('favoritos')
export class FavoritosController {
  constructor(private readonly servicioFavoritos: FavoritosService) {}

  @Post()
  @ApiOperation({ summary: 'HU-76: Guardar un producto en la lista de favoritos' })
  @ApiResponse({ status: 201, description: 'Producto agregado a favoritos exitosamente.' })
  @ApiResponse({ status: 400, description: 'El producto ya está en la lista de favoritos.' })
  agregar(@Body() datos: AgregarFavoritoDto) {
    return this.servicioFavoritos.agregar(datos);
  }

  @Get('usuario/:usuarioId')
  @ApiOperation({ summary: 'HU-77: Obtener todos los favoritos de un usuario con imágenes y variantes' })
  @ApiParam({ name: 'usuarioId', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de favoritos obtenida.' })
  obtenerPorUsuario(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.servicioFavoritos.obtenerPorUsuario(usuarioId);
  }

  @Delete('usuario/:usuarioId/producto/:productoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'HU-78: Quitar un producto de la lista de favoritos' })
  @ApiParam({ name: 'usuarioId', description: 'ID del usuario' })
  @ApiParam({ name: 'productoId', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto eliminado de favoritos.' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado en favoritos.' })
  eliminar(
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
    @Param('productoId', ParseUUIDPipe) productoId: string,
  ) {
    return this.servicioFavoritos.eliminar(usuarioId, productoId);
  }

  @Delete('usuario/:usuarioId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vaciar todos los productos de la lista de favoritos de un usuario' })
  @ApiParam({ name: 'usuarioId', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Todos los favoritos han sido eliminados.' })
  limpiarTodos(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.servicioFavoritos.limpiarTodos(usuarioId);
  }

  @Post('mover-al-carrito')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'HU-79: Pasar un producto favorito directamente al carrito de compras' })
  @ApiResponse({ status: 200, description: 'Producto movido al carrito exitosamente.' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente o variantes agotadas.' })
  @ApiResponse({ status: 404, description: 'Favorito no encontrado.' })
  moverAlCarrito(@Body() datos: MoverFavoritoAlCarritoDto) {
    return this.servicioFavoritos.moverAlCarrito(datos);
  }
}
