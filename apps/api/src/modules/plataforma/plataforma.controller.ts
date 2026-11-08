import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../autenticacion/guards/roles.guard';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { PlataformaService } from './plataforma.service';
import { ListarSuscripcionesQueryDto, ListarTiendasQueryDto } from './dto/consulta-plataforma.dto';

/** Platform operator console. Only the SUPERADMIN account passes the role check. */
@ApiTags('Plataforma')
@ApiBearerAuth()
@Controller('plataforma')
export class PlataformaController {
  constructor(private readonly servicio: PlataformaService) {}

  @Get('resumen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Resumen de la plataforma: tiendas por estado y plan, MRR e ingresos del mes' })
  @ApiResponse({ status: 200, description: 'Resumen calculado.' })
  resumen() {
    return this.servicio.resumen();
  }

  @Get('tiendas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Listado paginado de todas las tiendas con filtros' })
  @ApiResponse({ status: 200, description: 'Página de tiendas.' })
  tiendas(@Query() query: ListarTiendasQueryDto) {
    return this.servicio.listarTiendas(query);
  }

  @Get('suscripciones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Listado paginado de las suscripciones de todas las tiendas' })
  @ApiResponse({ status: 200, description: 'Página de suscripciones.' })
  suscripciones(@Query() query: ListarSuscripcionesQueryDto) {
    return this.servicio.listarSuscripciones(query);
  }

  @Post('tiendas/:id/suspender')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Suspender una tienda (no puede iniciar sesión ni ser resuelta)' })
  @ApiParam({ name: 'id', description: 'ID de la tienda' })
  @ApiResponse({ status: 200, description: 'Tienda suspendida.' })
  @ApiResponse({ status: 400, description: 'La tienda base no se puede suspender.' })
  suspender(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.servicio.suspender(id, req.user.userId);
  }

  @Post('tiendas/:id/reactivar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Reactivar una tienda suspendida' })
  @ApiParam({ name: 'id', description: 'ID de la tienda' })
  @ApiResponse({ status: 200, description: 'Tienda reactivada.' })
  reactivar(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.servicio.reactivar(id, req.user.userId);
  }
}
