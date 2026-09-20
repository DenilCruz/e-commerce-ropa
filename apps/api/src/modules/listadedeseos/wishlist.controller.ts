import { Controller, Get, Post, Body, Param, Delete, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FavoritosService } from './wishlist.service';
import { AgregarFavoritoDto } from './dto/agregar-favorito.dto';

@ApiTags('Favoritos (Lista de Deseos)')
@Controller('favoritos')
export class FavoritosController {
  constructor(private readonly servicioFavoritos: FavoritosService) {}

  @Post()
  @ApiOperation({ summary: 'Agregar un producto a la lista de deseos' })
  @ApiResponse({ status: 201, description: 'Producto agregado a favoritos exitosamente.' })
  @ApiResponse({ status: 400, description: 'El producto ya está en la lista de deseos.' })
  agregar(@Body() datos: AgregarFavoritoDto) {
    return this.servicioFavoritos.agregar(datos);
  }

  @Get('usuario/:usuarioId')
  @ApiOperation({ summary: 'Obtener todos los favoritos de un usuario' })
  @ApiParam({ name: 'usuarioId', description: 'ID del usuario' })
  obtenerPorUsuario(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.servicioFavoritos.obtenerPorUsuario(usuarioId);
  }

  @Delete('usuario/:usuarioId/producto/:productoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un producto de la lista de deseos' })
  @ApiParam({ name: 'usuarioId', description: 'ID del usuario' })
  @ApiParam({ name: 'productoId', description: 'ID del producto' })
  eliminar(
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
    @Param('productoId', ParseUUIDPipe) productoId: string,
  ) {
    return this.servicioFavoritos.eliminar(usuarioId, productoId);
  }
}
