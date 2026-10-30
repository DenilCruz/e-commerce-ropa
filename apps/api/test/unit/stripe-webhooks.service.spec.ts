jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { StripeWebhooksService } from '../../src/modules/facturacion/stripe-webhooks.service';

const evento = (type: string, metadata: Record<string, string> | undefined) =>
  ({ id: 'evt_1', type, data: { object: { id: 'cs_1', metadata } } }) as any;

describe('StripeWebhooksService', () => {
  let billing: any;
  let payments: any;
  let service: StripeWebhooksService;

  beforeEach(() => {
    billing = { procesarEvento: jest.fn().mockResolvedValue('PROCESADO') };
    payments = { completarPedidoDesdeWebhook: jest.fn().mockResolvedValue('PROCESADO') };
    service = new StripeWebhooksService(billing, payments);
  });

  it('una sesión pagada de un plan va a facturación', async () => {
    await service.procesar(evento('checkout.session.completed', { tipo: 'PLAN' }));

    expect(billing.procesarEvento).toHaveBeenCalledTimes(1);
    expect(payments.completarPedidoDesdeWebhook).not.toHaveBeenCalled();
  });

  it('una sesión pagada de un pedido va a pagos', async () => {
    await service.procesar(evento('checkout.session.completed', { tipo: 'PEDIDO', tenantId: 't', usuarioId: 'u' }));
    await service.procesar(evento('checkout.session.async_payment_succeeded', { tenantId: 't', usuarioId: 'u' })); // sesiones anteriores al marcado

    expect(payments.completarPedidoDesdeWebhook).toHaveBeenCalledTimes(2);
    expect(billing.procesarEvento).not.toHaveBeenCalled();
  });

  it('los demás eventos (expiradas, fallidas, desconocidos) los resuelve facturación', async () => {
    await service.procesar(evento('checkout.session.expired', { tipo: 'PLAN' }));
    await service.procesar(evento('customer.created', undefined));

    expect(billing.procesarEvento).toHaveBeenCalledTimes(2);
    expect(payments.completarPedidoDesdeWebhook).not.toHaveBeenCalled();
  });

  it('devuelve lo que resolvió quien lo atendió', async () => {
    payments.completarPedidoDesdeWebhook.mockResolvedValue('DUPLICADO');

    await expect(service.procesar(evento('checkout.session.completed', { tipo: 'PEDIDO' }))).resolves.toBe('DUPLICADO');
  });
});
