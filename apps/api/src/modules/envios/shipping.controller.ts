import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { ShippingService } from './shipping.service';
import { CrearMetodoEnvioDto } from './dto/crear-metodo-envio.dto';
import { ActualizarMetodoEnvioDto } from './dto/actualizar-metodo-envio.dto';
import { CotizarEnvioDto } from './dto/cotizar-envio.dto';
import { ActualizarEstadoEnvioDto } from './dto/actualizar-estado-envio.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../autenticacion/guards/roles.guard';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { CurrentUser } from '../autenticacion/decorators/current-user.decorator';

@ApiTags('Envíos')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // =========================================================================
  // HU-61 / HU-63: LISTAR MÉTODOS DE ENVÍO ACTIVOS
  // =========================================================================
  @Get('methods')
  @ApiOperation({
    summary: 'HU-63: Listar métodos de envío disponibles (Estándar, Express)',
  })
  @ApiResponse({ status: 200, description: 'Lista de métodos de envío disponibles.' })
  listarMetodos() {
    return this.shippingService.listarMetodos(true);
  }

  // =========================================================================
  // HU-62: COTIZAR COSTO DE ENVÍO SEGÚN SUBTOTAL
  // =========================================================================
  @Post('quote')
  @ApiOperation({
    summary: 'HU-62: Cotizar costo de envío antes de pagar',
    description: 'Calcula costos y determina si aplica envío gratis (compras >= Bs. 200).',
  })
  @ApiResponse({ status: 200, description: 'Opciones de envío con costos finales.' })
  cotizar(@Body() dto: CotizarEnvioDto) {
    return this.shippingService.cotizar(dto);
  }

  // =========================================================================
  // HU-64: RASTREAR ENVÍO CON CÓDIGO DE SEGUIMIENTO (PÚBLICO O CLIENTE)
  // =========================================================================
  @Get('track/:codigo')
  @ApiOperation({
    summary: 'HU-64: Rastrear paquete con número de guía o código de orden',
    description: 'Devuelve estado en 4 etapas, datos del courier, fechas y coordenadas para mapa Leaflet.',
  })
  @ApiParam({ name: 'codigo', description: 'Código de tracking (ej. TRK-BO-2026-XXXXX) o Nro Orden (NV-2026-XXXXX)' })
  @ApiResponse({ status: 200, description: 'Información de rastreo y trazabilidad en tiempo real.' })
  consultarTracking(@Param('codigo') codigo: string) {
    return this.shippingService.consultarTracking(codigo);
  }

  // =========================================================================
  // ADMIN: LISTAR TODOS LOS ENVÍOS
  // =========================================================================
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos los despachos y envíos (Admin)' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'busqueda', required: false, description: 'Buscar por guía, orden o cliente' })
  obtenerTodosAdmin(
    @Query('estado') estado?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    return this.shippingService.obtenerTodosAdmin({ estado, busqueda });
  }

  // =========================================================================
  // HU-61: CRUD DE MÉTODOS DE ENVÍO (ADMIN)
  // =========================================================================
  @Get('admin/methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos los métodos de envío, incluso inactivos (Admin)' })
  listarMetodosAdmin() {
    return this.shippingService.listarMetodos(false);
  }

  @Post('admin/methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'HU-61: Crear un nuevo método de envío (Admin)' })
  crearMetodo(@Body() dto: CrearMetodoEnvioDto) {
    return this.shippingService.crearMetodo(dto);
  }

  @Put('admin/methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'HU-61: Modificar costos y plazos de un método de envío (Admin)' })
  actualizarMetodo(
    @Param('id') id: string,
    @Body() dto: ActualizarMetodoEnvioDto,
  ) {
    return this.shippingService.actualizarMetodo(id, dto);
  }

  @Delete('admin/methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desactivar método de envío (Admin)' })
  eliminarMetodo(@Param('id') id: string) {
    return this.shippingService.eliminarMetodo(id);
  }

  // =========================================================================
  // HU-65: ACTUALIZAR ESTADO DE ENVÍO Y ASIGNAR GUÍA (ADMIN)
  // =========================================================================
  @Put('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-65: Actualizar estado de envío, transportadora y guía (Admin)',
  })
  actualizarEstadoEnvio(
    @Param('id') id: string,
    @Body() dto: ActualizarEstadoEnvioDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.shippingService.actualizarEstadoEnvio(id, dto, adminId);
  }
}
