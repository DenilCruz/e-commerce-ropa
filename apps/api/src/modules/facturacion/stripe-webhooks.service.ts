import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentsService } from '../pagos/payments.service';
import { BillingService, ResultadoEvento } from './billing.service';

/** Routes each Stripe event to whoever owns it: plan purchases to billing, paid order sessions to payments. */
@Injectable()
export class StripeWebhooksService {
  constructor(
    private readonly billing: BillingService,
    private readonly payments: PaymentsService,
  ) {}

  async procesar(evento: Stripe.Event): Promise<ResultadoEvento> {
    if (evento.type === 'checkout.session.completed' || evento.type === 'checkout.session.async_payment_succeeded') {
      const sesion = evento.data.object as Stripe.Checkout.Session;
      const tipo = sesion.metadata?.tipo;
      if (tipo !== 'PLAN' && tipo !== 'ALTA_TIENDA') return this.payments.completarPedidoDesdeWebhook(sesion);
    }
    return this.billing.procesarEvento(evento);
  }
}
