import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { CartService } from './cart.service';
import { AgregarItemCarritoDto } from './dto/agregar-item-carrito.dto';
import { ActualizarCantidadItemDto } from './dto/actualizar-cantidad-item.dto';
import { SincronizarCarritoDto } from './dto/sincronizar-carrito.dto';
import { CalcularCarritoTemporalDto } from './dto/calcular-carrito-temporal.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { CurrentUser } from '../autenticacion/decorators/current-user.decorator';

@ApiTags('Carrito')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // =========================================================================
  // HU-41 / HU-44 / HU-45: OBTENER CARRITO DEL USUARIO
  // =========================================================================
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-41: Obtener el carrito de compras del usuario autenticado',
    description: 'Devuelve los productos en el carrito con subtotales, total calculado, tallas y colores.',
  })
  @ApiResponse({ status: 200, description: 'Carrito obtenido exitosamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async obtenerCarrito(@CurrentUser('userId') usuarioId: string) {
    return this.cartService.obtenerOCrearCarrito(usuarioId);
  }

  // =========================================================================
  // HU-40 / HU-46: AGREGAR PRODUCTO AL CARRITO
  // =========================================================================
  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-40: Agregar producto al carrito eligiendo talla y color',
    description: 'Agrega una variante de producto al carrito validando stock disponible (HU-46).',
  })
  @ApiResponse({ status: 200, description: 'Producto agregado al carrito exitosamente.' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente o datos inválidos.' })
  @ApiResponse({ status: 404, description: 'Producto o variante no encontrada.' })
  async agregarItem(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: AgregarItemCarritoDto,
  ) {
    return this.cartService.agregarItem(usuarioId, dto);
  }

  // =========================================================================
  // HU-42 / HU-46: CAMBIAR CANTIDAD DE UN ITEM
  // =========================================================================
  @Put('items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-42: Cambiar la cantidad de un item en el carrito',
    description: 'Actualiza las unidades de un item validando stock disponible (HU-46). Cantidad 0 lo elimina.',
  })
  @ApiParam({ name: 'itemId', description: 'ID del detalle_carrito' })
  @ApiResponse({ status: 200, description: 'Cantidad actualizada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente.' })
  @ApiResponse({ status: 404, description: 'Item no encontrado en el carrito.' })
  async actualizarCantidad(
    @CurrentUser('userId') usuarioId: string,
    @Param('itemId') itemId: string,
    @Body() dto: ActualizarCantidadItemDto,
  ) {
    return this.cartService.actualizarCantidadItem(usuarioId, itemId, dto);
  }

  // =========================================================================
  // HU-43: ELIMINAR UN ITEM DEL CARRITO
  // =========================================================================
  @Delete('items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-43: Eliminar un item específico del carrito',
    description: 'Remueve el item seleccionado del carrito y recalcula el total.',
  })
  @ApiParam({ name: 'itemId', description: 'ID del detalle_carrito a eliminar' })
  @ApiResponse({ status: 200, description: 'Item eliminado del carrito.' })
  @ApiResponse({ status: 404, description: 'Item no encontrado.' })
  async eliminarItem(
    @CurrentUser('userId') usuarioId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.eliminarItem(usuarioId, itemId);
  }

  // =========================================================================
  // HU-43: VACIAR TODO EL CARRITO
  // =========================================================================
  @Delete('vaciar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-43: Vaciar todos los productos del carrito',
    description: 'Elimina todos los artículos del carrito del usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Carrito vaciado exitosamente.' })
  async vaciarCarrito(@CurrentUser('userId') usuarioId: string) {
    return this.cartService.vaciarCarrito(usuarioId);
  }

  // =========================================================================
  // HU-47: SINCRONIZAR CARRITO TEMPORAL DE VISITANTE TRAS INICIAR SESIÓN
  // =========================================================================
  @Post('sincronizar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-47: Sincronizar/fusionar carrito de visitante tras login',
    description: 'Fusiona los productos acumulados por el visitante en su sesión local con su carrito en base de datos.',
  })
  @ApiResponse({ status: 200, description: 'Carrito sincronizado exitosamente.' })
  async sincronizarCarrito(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: SincronizarCarritoDto,
  ) {
    return this.cartService.sincronizarCarrito(usuarioId, dto);
  }

  // =========================================================================
  // HU-47: CALCULAR CARRITO TEMPORAL (VISITANTES SIN LOGIN)
  // =========================================================================
  @Post('calcular-temporal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-47: Calcular subtotales y validar stock para carrito temporal de visitante',
    description: 'Permite a visitantes cotizar su carrito y verificar stock en tiempo real sin iniciar sesión.',
  })
  @ApiResponse({ status: 200, description: 'Cálculo del carrito temporal.' })
  async calcularCarritoTemporal(@Body() dto: CalcularCarritoTemporalDto) {
    return this.cartService.calcularCarritoTemporal(dto);
  }
}
