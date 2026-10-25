import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../autenticacion/guards/roles.guard';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { CurrentUser } from '../autenticacion/decorators/current-user.decorator';
import { BajaPushDto, SuscripcionPushDto } from './dto/suscripcion-push.dto';
import { PushService } from './push.service';

@ApiTags('Notificaciones push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERADMIN')
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('clave')
  @ApiOperation({ summary: 'Clave pública VAPID para suscribir el navegador, y si el servidor tiene push configurado' })
  clave() {
    return this.pushService.clavePublica();
  }

  @Post('suscripcion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Guardar la suscripción push del navegador del administrador' })
  async suscribir(@CurrentUser('userId') usuarioId: string, @Body() dto: SuscripcionPushDto): Promise<void> {
    await this.pushService.suscribir(usuarioId, dto);
  }

  @Post('baja')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar la suscripción push de este navegador' })
  async baja(@Body() dto: BajaPushDto): Promise<void> {
    await this.pushService.cancelar(dto.endpoint);
  }

  @Post('prueba')
  @ApiOperation({ summary: 'Enviar una notificación de prueba a los navegadores suscritos de la tienda' })
  async prueba() {
    const entregadas = await this.pushService.notificarTienda({
      titulo: 'AURA',
      cuerpo: 'Las notificaciones están funcionando.',
      url: '/admin/ventas',
    });
    return { entregadas };
  }
}
