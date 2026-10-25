import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../autenticacion/guards/roles.guard';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { CurrentUser } from '../autenticacion/decorators/current-user.decorator';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor';
import { CrearVentaPosDto } from './dto/crear-venta-pos.dto';
import { PosSalesService } from './pos-sales.service';

@ApiTags('Ventas de mostrador')
@Controller('sales')
export class PosSalesController {
  constructor(private readonly posSalesService: PosSalesService) {}

  @Post('pos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'UUID v4 generado al iniciar la venta.' })
  @ApiOperation({
    summary: 'Registrar una venta de mostrador en efectivo (también la que se hizo sin conexión)',
    description: 'Descuenta el stock en una sola transacción. Si falta stock responde 409 con el detalle por ítem.',
  })
  @ApiResponse({ status: 201, description: 'Venta registrada.' })
  @ApiResponse({ status: 409, description: 'Stock insuficiente (codigo STOCK_CONFLICT) o clave en proceso.' })
  @ApiResponse({ status: 422, description: 'La Idempotency-Key ya se usó con otra venta.' })
  registrar(
    @CurrentUser('userId') vendedorId: string,
    @Body() dto: CrearVentaPosDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    // Without the key a retry after a lost response would register the sale twice
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key es obligatoria para registrar una venta.');
    }
    return this.posSalesService.registrar(vendedorId, dto, idempotencyKey);
  }
}
