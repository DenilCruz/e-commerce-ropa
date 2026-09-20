import {
  Controller,
  Post,
  Get,
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

import { MailService } from './mail.service';
import { MailQueueService } from './mail-queue.service';
import { EmailBienvenidaDto } from './dto/email-bienvenida.dto';
import { ConfirmacionCompraEmailDto } from './dto/confirmacion-compra.dto';
import { EncolarCorreoDto } from './dto/encolar-correo.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../autenticacion/guards/roles.guard';
import { Roles } from '../autenticacion/decorators/roles.decorator';

@ApiTags('Correos')
@Controller('mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly mailQueueService: MailQueueService,
  ) {}

  // =========================================================================
  // HU-84: ENVIAR / ENCOLAR CORREO DE BIENVENIDA
  // =========================================================================
  @Post('bienvenida')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-84: Enviar correo de bienvenida a un usuario registrado',
    description: 'Encola y envía un correo con diseño moderno dando la bienvenida al nuevo usuario e invitándolo a explorar el catálogo.',
  })
  @ApiResponse({ status: 200, description: 'Correo de bienvenida encolado/enviado exitosamente.' })
  async enviarBienvenida(@Body() dto: EmailBienvenidaDto) {
    const res = await this.mailService.enviarEmailBienvenida(dto, true);
    return {
      exito: true,
      mensaje: `Correo de bienvenida para ${dto.nombre} (${dto.correo}) programado exitosamente en background.`,
      cola: res,
    };
  }

  // =========================================================================
  // HU-86: ENVIAR / ENCOLAR CORREO DE CONFIRMACIÓN DE COMPRA
  // =========================================================================
  @Post('confirmacion-compra')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-86: Enviar correo de confirmación de compra y factura',
    description: 'Genera una factura detallada con número de pedido, lista de productos (talla, color, cantidad, precio), desglose de descuentos/cupones, costos de envío y total general.',
  })
  @ApiResponse({ status: 200, description: 'Confirmación de compra encolada/enviada exitosamente.' })
  async enviarConfirmacionCompra(@Body() dto: ConfirmacionCompraEmailDto) {
    const res = await this.mailService.enviarEmailConfirmacionCompra(dto, true);
    return {
      exito: true,
      mensaje: `Confirmación del pedido #${dto.nroPedido} programada para <${dto.correo}> en background.`,
      cola: res,
    };
  }

  // =========================================================================
  // HU-87: ENCOLAR CORREO GENÉRICO EN BACKGROUND
  // =========================================================================
  @Post('encolar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-87: Encolar un correo para envío asíncrono en background (Solo Admin)',
    description: 'Inserta un correo en la cola de despacho en background con reintentos automáticos.',
  })
  @ApiResponse({ status: 200, description: 'Correo encolado.' })
  async encolarCorreo(@Body() dto: EncolarCorreoDto) {
    const res = this.mailQueueService.encolar({
      tipo: dto.tipo,
      destinatario: dto.para,
      asunto: dto.asunto,
      html: dto.contenidoHtml,
      text: dto.textoPlano,
    });
    return res;
  }

  // =========================================================================
  // HU-87: CONSULTAR ESTADO Y MÉTRICAS DE LA COLA BACKGROUND
  // =========================================================================
  @Get('cola/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-87: Consultar estado y métricas de la cola de correos (Solo Admin)',
    description: 'Devuelve métricas en tiempo real (pendientes, en proceso, completados, fallidos) y el historial reciente de envíos.',
  })
  @ApiResponse({ status: 200, description: 'Estado de la cola obtenido exitosamente.' })
  obtenerEstadoCola() {
    return this.mailQueueService.obtenerEstado();
  }

  // =========================================================================
  // HU-87: REINTENTAR UN JOB FALLIDO
  // =========================================================================
  @Post('cola/reintentar/:jobId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMINISTRADOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-87: Reintentar envío de un correo fallido por su ID de Job (Solo Admin)',
  })
  @ApiParam({ name: 'jobId', description: 'UUID del trabajo encolado' })
  @ApiResponse({ status: 200, description: 'Job reprogramado para reintento.' })
  reintentarJob(@Param('jobId') jobId: string) {
    return this.mailQueueService.reintentarJob(jobId);
  }
}
