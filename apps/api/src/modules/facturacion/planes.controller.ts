import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { CurrentUser } from '../autenticacion/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { CheckoutPlanDto } from './dto/checkout-plan.dto';

@ApiTags('Planes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planes')
export class PlanesController {
  constructor(private readonly billing: BillingService) {}

  @Post('checkout')
  @ApiOperation({
    summary: 'Abrir el pago de un plan',
    description:
      'Crea la sesión de pago en Stripe y devuelve su URL. El plan no cambia aquí: se activa cuando el webhook confirma el pago. ' +
      'Solo el propietario o un ADMIN de la tienda puede contratar.',
  })
  checkout(@CurrentUser() usuario: any, @Body() dto: CheckoutPlanDto) {
    return this.billing.crearCheckout(usuario.tenantId, usuario.userId, dto.plan, dto.periodo);
  }

  @Get('estado')
  @ApiOperation({ summary: 'Estado de una compra de plan (la pantalla de retorno lo consulta hasta que se activa)' })
  estado(@Query('session_id') sesionId?: string) {
    if (!sesionId) throw new BadRequestException('Falta session_id.');
    return this.billing.obtenerEstado(sesionId);
  }
}
