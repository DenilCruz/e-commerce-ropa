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
  // HU-49: MIS PEDIDOS (CLIENTE)
  // =========================================================================
  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-49: Obtener historial de pedidos del usuario autenticado',
    description: 'Devuelve todas las órdenes de compra con estado de pedido, pago y envío.',
  })
  @ApiResponse({ status: 200, description: 'Listado de órdenes del cliente.' })
  obtenerMisPedidos(@CurrentUser('userId') usuarioId: string) {
    return this.ordersService.obtenerMisPedidos(usuarioId);
  }

  // =========================================================================
  // HU-51: CANCELAR PEDIDO SI AÚN NO FUE ENVIADO (CLIENTE)
  // =========================================================================
  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-51: Cancelar un pedido si aún no fue enviado',
    description: 'Permite al cliente cancelar pedidos pendientes o pagados antes del despacho, restaurando stock.',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden a cancelar' })
  cancelarPedidoCliente(
    @Param('id') id: string,
    @CurrentUser('userId') usuarioId: string,
    @Body('motivo') motivo?: string,
  ) {
    return this.ordersService.cancelarPedidoCliente(usuarioId, id, motivo);
  }

  // =========================================================================
  // HU-53: LISTAR TODOS LOS PEDIDOS (ADMIN)
  // =========================================================================
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'HU-53: Listar todos los pedidos con filtros para el panel admin' })
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
  // HU-54 & HU-55: ACTUALIZAR ESTADO DE PEDIDO (ADMIN)
  // =========================================================================
  @Put('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'HU-54: Actualizar estado de una orden y registrar auditoría (Admin)' })
  actualizarEstadoAdmin(
    @Param('id') id: string,
    @Body('estado') nuevoEstado: string,
    @Body('comentario') comentario: string,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.ordersService.actualizarEstadoAdmin(id, nuevoEstado, comentario, adminId);
  }

  // =========================================================================
  // HU-55: OBTENER HISTORIAL DE CAMBIOS DE ESTADO (AUDITORÍA)
  // =========================================================================
  @Get(':id/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'HU-55: Obtener historial de auditoría de un pedido' })
  @ApiParam({ name: 'id', description: 'ID de la orden' })
  obtenerHistorial(@Param('id') id: string) {
    return this.ordersService.obtenerHistorial(id);
  }

  // =========================================================================
  // HU-50: DETALLE DE PEDIDO
  // =========================================================================
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'HU-50: Obtener detalle y estado de un pedido por ID' })
  @ApiParam({ name: 'id', description: 'ID de la orden' })
  obtenerDetalle(
    @Param('id') id: string,
    @CurrentUser('userId') usuarioId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.obtenerDetalle(id, usuarioId, role);
  }
}
