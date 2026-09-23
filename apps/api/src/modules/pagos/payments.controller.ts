import {
  Controller,
  Get,
  Post,
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

import { PaymentsService } from './payments.service';
import { CrearIntentoPagoDto } from './dto/crear-intento-pago.dto';
import { ConfirmarPagoTarjetaDto } from './dto/confirmar-pago-tarjeta.dto';
import { PagoContraEntregaDto } from './dto/pago-contra-entrega.dto';
import { PagoQrDto } from './dto/pago-qr.dto';
import { ReembolsarPagoDto } from './dto/reembolsar-pago.dto';

import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../autenticacion/guards/roles.guard';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { CurrentUser } from '../autenticacion/decorators/current-user.decorator';

@ApiTags('Pagos')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // =========================================================================
  // METODOS DE PAGO DISPONIBLES
  // =========================================================================
  @Get('metodos')
  @ApiOperation({ summary: 'Listar métodos de pago disponibles' })
  @ApiResponse({ status: 200, description: 'Métodos de pago retornados.' })
  listarMetodos() {
    return this.paymentsService.listarMetodosPago();
  }

  // =========================================================================
  // HU-56: CREAR INTENTO DE PAGO (STRIPE)
  // =========================================================================
  @Post('intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-56: Crear PaymentIntent con Stripe para pagar con tarjeta',
    description: 'Genera un PaymentIntent en Stripe en base al total del carrito y devuelve el client_secret.',
  })
  @ApiResponse({ status: 200, description: 'Intento de pago creado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Carrito vacío o stock insuficiente.' })
  crearIntento(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: CrearIntentoPagoDto,
  ) {
    return this.paymentsService.crearIntentoPago(usuarioId, dto);
  }

  // =========================================================================
  // STRIPE EMBEDDED CHECKOUT (HU-56: Checkout Embebido Oficial)
  // =========================================================================
  @Post('embedded-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-56: Crear sesión de Stripe Embedded Checkout',
    description: 'Genera una Checkout Session embebida de Stripe y devuelve el client_secret.',
  })
  @ApiResponse({ status: 200, description: 'Sesión embebida creada exitosamente.' })
  crearSesionEmbebida(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: CrearIntentoPagoDto,
  ) {
    return this.paymentsService.crearSesionEmbebida(usuarioId, dto);
  }

  @Get('session-status/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-57 / HU-58: Consultar estado de sesión embebida y registrar orden',
    description: 'Verifica si la sesión embebida en Stripe fue completada y genera la orden en BD.',
  })
  consultarEstadoSesion(
    @CurrentUser('userId') usuarioId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.paymentsService.consultarEstadoSesion(usuarioId, sessionId);
  }

  // =========================================================================
  // HU-56 / HU-58: CONFIRMAR PAGO CON TARJETA
  // =========================================================================
  @Post('confirm-card')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-56 / HU-58: Confirmar pago con tarjeta y actualizar orden en el sistema',
    description: 'Valida la transacción en Stripe, descuenta stock, crea la orden y registra el pago como APROBADO.',
  })
  @ApiResponse({ status: 200, description: 'Pago confirmado y orden generada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Transacción no completada o error de procesamiento.' })
  confirmarPagoTarjeta(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: ConfirmarPagoTarjetaDto,
  ) {
    return this.paymentsService.confirmarPagoTarjeta(usuarioId, dto);
  }

  // =========================================================================
  // HU-60: PAGO CONTRA ENTREGA (EFECTIVO)
  // =========================================================================
  @Post('cash-on-delivery')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'HU-60: Procesar pedido con pago contra entrega en efectivo',
    description: 'Registra la orden con estado PENDIENTE y pago contra entrega.',
  })
  @ApiResponse({ status: 201, description: 'Pedido contra entrega registrado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Carrito vacío o stock insuficiente.' })
  pagoContraEntrega(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: PagoContraEntregaDto,
  ) {
    return this.paymentsService.pagoContraEntrega(usuarioId, dto);
  }

  // =========================================================================
  // PAGO CON QR SIMPLE (TRANSFERENCIA BANCARIA INMEDIATA)
  // =========================================================================
  @Post('qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Procesar pedido con pago por transferencia QR Simple',
    description: 'Registra la orden confirmada y el pago validado por transferencia bancaria QR.',
  })
  @ApiResponse({ status: 201, description: 'Pedido con QR registrado y confirmado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Carrito vacío o stock insuficiente.' })
  pagoQr(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: PagoQrDto,
  ) {
    return this.paymentsService.pagoQr(usuarioId, dto);
  }

  // =========================================================================
  // HU-57: CONSULTAR ESTADO DE PAGO Y COMPROBANTE
  // =========================================================================
  @Get('status/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-57: Consultar estado de pago y comprobante de una orden',
    description: 'Devuelve si el pago está PENDIENTE, APROBADO, RECHAZADO o REEMBOLSADO.',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la orden (nota_venta)' })
  @ApiResponse({ status: 200, description: 'Estado y comprobante de pago obtenido.' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada.' })
  consultarEstado(
    @CurrentUser('userId') usuarioId: string,
    @CurrentUser('role') role: string,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.consultarEstadoPago(usuarioId, orderId, role);
  }

  // =========================================================================
  // HU-59: REEMBOLSAR PAGO (ADMIN)
  // =========================================================================
  @Post('refund/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-59: Reembolsar un pago si el cliente reclama (Admin)',
    description: 'Reembolsa la transacción en Stripe si aplica, cambia estado a REEMBOLSADO y restaura el stock.',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la orden a reembolsar' })
  @ApiResponse({ status: 200, description: 'Reembolso procesado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Error al procesar el reembolso en Stripe o BD.' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden realizar reembolsos.' })
  reembolsarPago(
    @CurrentUser('userId') adminId: string,
    @Param('orderId') orderId: string,
    @Body() dto: ReembolsarPagoDto,
  ) {
    return this.paymentsService.reembolsarPago(adminId, orderId, dto);
  }
}
