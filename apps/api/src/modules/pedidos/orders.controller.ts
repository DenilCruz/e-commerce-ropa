import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../autenticacion/guards/roles.guard';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { CurrentUser } from '../autenticacion/decorators/current-user.decorator';

@ApiTags('Pedidos')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // =========================================================================
  // HU-57: MIS PEDIDOS (CLIENTE)
  // =========================================================================
  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-57: Obtener historial de pedidos del usuario autenticado',
    description: 'Devuelve todas las órdenes de compra con estado de pedido y pago.',
  })
  @ApiResponse({ status: 200, description: 'Listado de órdenes del cliente.' })
  obtenerMisPedidos(@CurrentUser('userId') usuarioId: string) {
    return this.ordersService.obtenerMisPedidos(usuarioId);
  }

  // =========================================================================
  // LISTAR TODOS LOS PEDIDOS (ADMIN)
  // =========================================================================
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos los pedidos para el panel admin' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'busqueda', required: false, description: 'Buscar por Nro o cliente' })
  @ApiQuery({ name: 'fechaInicio', required: false, description: 'Fecha inicio YYYY-MM-DD' })
  @ApiQuery({ name: 'fechaFin', required: false, description: 'Fecha fin YYYY-MM-DD' })
  obtenerTodosAdmin(
    @Query('estado') estado?: string,
    @Query('busqueda') busqueda?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.ordersService.obtenerTodosAdmin({
      estado,
      busqueda,
      fechaInicio,
      fechaFin,
    });
  }

  // =========================================================================
  // ACTUALIZAR ESTADO DE PEDIDO (ADMIN)
  // =========================================================================
  @Put('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar estado de una orden (Admin)' })
  actualizarEstadoAdmin(
    @Param('id') id: string,
    @Body('estado') nuevoEstado: string,
  ) {
    return this.ordersService.actualizarEstadoAdmin(id, nuevoEstado);
  }

  // =========================================================================
  // DETALLE DE PEDIDO
  // =========================================================================
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener detalle de un pedido por ID' })
  @ApiParam({ name: 'id', description: 'ID de la orden' })
  obtenerDetalle(
    @Param('id') id: string,
    @CurrentUser('userId') usuarioId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.obtenerDetalle(id, usuarioId, role);
  }
}
