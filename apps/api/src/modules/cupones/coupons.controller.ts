import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';

import { CouponsService } from './coupons.service';
import { CrearCuponDto } from './dto/crear-cupon.dto';
import { ActualizarCuponDto } from './dto/actualizar-cupon.dto';
import { AplicarCuponDto } from './dto/aplicar-cupon.dto';
import { CambiarEstadoCuponDto } from './dto/cambiar-estado-cupon.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../autenticacion/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../autenticacion/guards/roles.guard';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { CurrentUser } from '../autenticacion/decorators/current-user.decorator';

@ApiTags('Cupones')
@Controller('cupones')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // =========================================================================
  // HU-71: CREAR CUPÓN (ADMIN)
  // =========================================================================
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-71: Crear un nuevo cupón con descuento % o monto fijo (Solo Admin)',
    description: 'Permite al administrador crear cupones configurando tipo, valor, vigencia y restricciones (HU-71 y HU-72).',
  })
  @ApiResponse({ status: 201, description: 'Cupón creado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o rango de fechas incorrecto.' })
  @ApiResponse({ status: 409, description: 'El código del cupón ya existe.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (Requiere rol Admin).' })
  async crearCupon(@Body() dto: CrearCuponDto) {
    return this.couponsService.crearCupon(dto);
  }

  // =========================================================================
  // LISTAR CUPONES (ADMIN / PÚBLICO)
  // =========================================================================
  @Get()
  @ApiOperation({
    summary: 'Listar cupones registrados',
    description: 'Obtiene todos los cupones. Permite filtrar solo cupones activos y vigentes.',
  })
  @ApiQuery({
    name: 'soloActivos',
    required: false,
    type: Boolean,
    description: 'Si es true, lista únicamente cupones activos dentro del rango de vigencia.',
  })
  @ApiResponse({ status: 200, description: 'Listado de cupones obtenido exitosamente.' })
  async listarCupones(@Query('soloActivos') soloActivos?: string) {
    const soloActivosBool = soloActivos === 'true' || soloActivos === '1';
    return this.couponsService.listarCupones(soloActivosBool);
  }

  // =========================================================================
  // HU-73 & HU-74: APLICAR CUPÓN (CLIENTE / VISITANTE)
  // =========================================================================
  @Post('aplicar')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-73 & HU-74: Validar y aplicar un cupón al carrito',
    description: 'Calcula el descuento aplicable sobre el subtotal verificando vigencia, monto mínimo y límites de uso. Notifica si es inválido (HU-74).',
  })
  @ApiResponse({ status: 200, description: 'Cupón aplicado y descuento calculado con éxito.' })
  @ApiResponse({ status: 400, description: 'Cupón inválido, expirado, inactivo o condiciones no cumplidas.' })
  async aplicarCupon(
    @Body() dto: AplicarCuponDto,
    @CurrentUser('userId') usuarioId?: string,
  ) {
    return this.couponsService.aplicarCupon(dto, usuarioId);
  }

  // =========================================================================
  // OBTENER CUPÓN POR ID
  // =========================================================================
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener información detallada de un cupón por su ID',
  })
  @ApiParam({ name: 'id', description: 'UUID del cupón' })
  @ApiResponse({ status: 200, description: 'Detalle del cupón.' })
  @ApiResponse({ status: 404, description: 'Cupón no encontrado.' })
  async obtenerPorId(@Param('id') id: string) {
    return this.couponsService.obtenerCuponPorId(id);
  }

  // =========================================================================
  // HU-72: ACTUALIZAR CUPÓN (ADMIN)
  // =========================================================================
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-72: Actualizar restricciones y datos del cupón (Solo Admin)',
    description: 'Modifica fechas, límites de uso, valor o monto mínimo del cupón.',
  })
  @ApiParam({ name: 'id', description: 'UUID del cupón a actualizar' })
  @ApiResponse({ status: 200, description: 'Cupón actualizado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos o fechas inválidas.' })
  @ApiResponse({ status: 404, description: 'Cupón no encontrado.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (Requiere rol Admin).' })
  async actualizarCupon(
    @Param('id') id: string,
    @Body() dto: ActualizarCuponDto,
  ) {
    return this.couponsService.actualizarCupon(id, dto);
  }

  // =========================================================================
  // HU-75: DESACTIVAR / ACTIVAR CUPÓN (ADMIN)
  // =========================================================================
  @Patch(':id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-75: Desactivar o activar un cupón inmediatamente (Solo Admin)',
    description: 'Cambia el estado activo (true/false) de un cupón.',
  })
  @ApiParam({ name: 'id', description: 'UUID del cupón' })
  @ApiResponse({ status: 200, description: 'Estado del cupón actualizado exitosamente.' })
  @ApiResponse({ status: 404, description: 'Cupón no encontrado.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (Requiere rol Admin).' })
  async cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoCuponDto,
  ) {
    return this.couponsService.cambiarEstado(id, dto.activo);
  }

  // =========================================================================
  // ELIMINAR CUPÓN (ADMIN)
  // =========================================================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar un cupón de la base de datos (Solo Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID del cupón' })
  @ApiResponse({ status: 200, description: 'Cupón eliminado exitosamente.' })
  @ApiResponse({ status: 404, description: 'Cupón no encontrado.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (Requiere rol Admin).' })
  async eliminarCupon(@Param('id') id: string) {
    return this.couponsService.eliminarCupon(id);
  }
}
