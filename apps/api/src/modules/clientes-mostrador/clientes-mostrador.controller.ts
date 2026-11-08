import { Body, Controller, Get, HttpStatus, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../autenticacion/guards/roles.guard';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { ClientesMostradorService } from './clientes-mostrador.service';
import { ClienteMostradorDto } from './dto/cliente-mostrador.dto';

@ApiTags('Clientes de mostrador')
@Controller('clientes-mostrador')
export class ClientesMostradorController {
  constructor(private readonly servicio: ClientesMostradorService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDEDOR', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Registrar un cliente de mostrador (también el creado sin conexión)',
    description: 'Idempotente por id: el mismo id devuelve el cliente ya guardado.',
  })
  @ApiResponse({ status: 201, description: 'Cliente creado.' })
  @ApiResponse({ status: 200, description: 'El id ya existía en la tienda; se devuelve el existente.' })
  @ApiResponse({ status: 409, description: 'Otro cliente tiene ese CI (codigo CLIENTE_DUPLICADO).' })
  async crear(@Body() dto: ClienteMostradorDto, @Res({ passthrough: true }) res: { status(code: number): unknown }) {
    const { creado, cliente } = await this.servicio.crear(dto);
    res.status(creado ? HttpStatus.CREATED : HttpStatus.OK);
    return cliente;
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDEDOR', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar clientes de mostrador por nombre, CI, celular o correo' })
  @ApiQuery({ name: 'busqueda', required: false })
  @ApiQuery({ name: 'limite', required: false, description: 'Máximo 200 (50 por defecto).' })
  listar(@Query('busqueda') busqueda?: string, @Query('limite') limite?: string) {
    return this.servicio.listar(busqueda, limite === undefined ? undefined : Number(limite));
  }
}
