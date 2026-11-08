import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { CurrentUser } from '../autenticacion/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { AltaTiendaDto } from './dto/alta-tienda.dto';
import { CheckoutPlanDto } from './dto/checkout-plan.dto';
import { PagoSimuladoDto } from './dto/pago-simulado.dto';

@ApiTags('Planes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planes')
export class PlanesController {
  constructor(private readonly billing: BillingService) {}

  @Post('checkout')
  @ApiOperation({
    summary: 'Abrir el pago de un plan para una tienda que ya existe',
    description:
      'Crea la suscripción en Stripe y devuelve la URL de pago. El plan no cambia aquí: se activa cuando el webhook confirma el pago. ' +
      'Solo el propietario o un ADMIN de la tienda puede contratar.',
  })
  checkout(@CurrentUser() usuario: any, @Body() dto: CheckoutPlanDto) {
    return this.billing.crearCheckout(usuario.tenantId, usuario.userId, dto.plan, dto.periodo);
  }

  @Post('alta-tienda')
  @ApiOperation({
    summary: 'Contratar un plan de pago y crear la tienda al confirmarse el pago',
    description:
      'Para quien todavía no tiene la tienda. Devuelve la URL de pago de Stripe; la tienda no existe hasta que el webhook firmado ' +
      'confirma el cobro, y entonces se crea sola con el plan elegido. Exige correo verificado.',
  })
  altaTienda(@CurrentUser() usuario: any, @Body() dto: AltaTiendaDto) {
    return this.billing.crearAltaTienda(usuario.userId, dto.nombre, dto.plan, dto.periodo);
  }

  @Get('estado')
  @ApiOperation({ summary: 'Estado de una compra (la pantalla de retorno lo consulta hasta que se activa)' })
  estado(@CurrentUser() usuario: any, @Query('session_id') sesionId?: string) {
    if (!sesionId) throw new BadRequestException('Falta session_id.');
    return this.billing.obtenerEstado(sesionId, usuario.userId);
  }

  @Get('mi-suscripcion')
  @ApiOperation({ summary: 'Suscripción vigente de la tienda activa (plan, renovación, último cobro fallido)' })
  miSuscripcion(@CurrentUser() usuario: any) {
    return this.billing.obtenerMiSuscripcion(usuario.tenantId, usuario.userId);
  }

  @Post('cancelar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar la renovación del plan',
    description: 'El plan sigue vigente hasta que termine el período ya pagado y después vuelve a FREE_TRIAL.',
  })
  cancelar(@CurrentUser() usuario: any) {
    return this.billing.cancelarSuscripcion(usuario.tenantId, usuario.userId);
  }

  @Post('reanudar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Volver a activar una renovación cancelada mientras el período pagado no haya terminado' })
  reanudar(@CurrentUser() usuario: any) {
    return this.billing.reanudarSuscripcion(usuario.tenantId, usuario.userId);
  }

  @Post('pago-simulado')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pagar en la pasarela simulada',
    description:
      'Solo con PLAN_PAYMENT_MODE distinto de stripe (por defecto). Valida el pago como lo haría una pasarela y, si lo aprueba, ejecuta la misma ' +
      'confirmación que el webhook de Stripe: crea la tienda o activa el plan. No se hace ningún cargo y los datos de la tarjeta no se guardan.',
  })
  pagoSimulado(@CurrentUser() usuario: any, @Body() dto: PagoSimuladoDto) {
    return this.billing.confirmarPagoSimulado(usuario.userId, dto.sessionId, dto);
  }

  @Post('simulacion/renovar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulación: el próximo cobro del período se aprueba y extiende el plan' })
  simularRenovacion(@CurrentUser() usuario: any) {
    return this.billing.simularCobroDelPeriodo(usuario.tenantId, usuario.userId, 'EXITOSO');
  }

  @Post('simulacion/cobro-fallido')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulación: el próximo cobro del período falla y se avisa al administrador' })
  simularCobroFallido(@CurrentUser() usuario: any) {
    return this.billing.simularCobroDelPeriodo(usuario.tenantId, usuario.userId, 'FALLIDO');
  }
}
