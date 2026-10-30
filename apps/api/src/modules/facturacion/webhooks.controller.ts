import { Controller, Headers, HttpCode, HttpStatus, Logger, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { StripeWebhooksService } from './stripe-webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly billing: BillingService,
    private readonly webhooks: StripeWebhooksService,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de Stripe',
    description:
      'Recibe los eventos de Stripe. No usa sesión: la autenticidad se comprueba con la firma sobre el cuerpo crudo. ' +
      'Cada evento se procesa una sola vez; los repetidos responden 200 sin efectos.',
  })
  async stripe(@Req() req: Request & { rawBody?: Buffer }, @Headers('stripe-signature') firma?: string) {
    const evento = this.billing.verificarFirma(req.rawBody, firma);
    const resultado = await this.webhooks.procesar(evento);
    this.logger.log(`Evento ${evento.id} (${evento.type}): ${resultado}`);
    return { received: true };
  }
}
