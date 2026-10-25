jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

const stripeMock: any = {
  paymentIntents: { create: jest.fn(), retrieve: jest.fn(), confirm: jest.fn() },
  checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
};
jest.mock('stripe', () => jest.fn().mockImplementation(() => stripeMock));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/pagos/payments.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('PaymentsService Stripe payments are bound to store, user and amount', () => {
  const TENANT = 'tenant-luna';
  const USER = 'user-1';
  const TOTAL = 150; // 15000 cents
  const REACHED_ORDER_CREATION = new Error('reached order creation');

  let service: PaymentsService;
  let paymentRepo: any;
  let dataSource: any;
  let userRepo: any;
  let secretKey: string;

  const intent = (over: Record<string, unknown> = {}, metadata: Record<string, string> = {}) => ({
    id: 'pi_1',
    status: 'succeeded',
    amount: TOTAL * 100,
    amount_received: TOTAL * 100,
    currency: 'bob',
    metadata: { tenantId: TENANT, usuarioId: USER, ...metadata },
    ...over,
  });

  const session = (over: Record<string, unknown> = {}, metadata: Record<string, string> = {}) => ({
    id: 'cs_1',
    status: 'complete',
    payment_status: 'paid',
    payment_intent: 'pi_1',
    amount_total: TOTAL * 100,
    metadata: { tenantId: TENANT, usuarioId: USER, ...metadata },
    ...over,
  });

  const build = () => {
    const none = {} as any;
    return new PaymentsService(
      paymentRepo, none, none, none, none, none, none, none, none, userRepo, none, none, none, none, dataSource,
      { get: (key: string) => (key === 'STRIPE_SECRET_KEY' ? secretKey : undefined) } as any,
    );
  };

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue(TENANT);
    jest.clearAllMocks();
    secretKey = 'sk_test_123';
    paymentRepo = { findOne: jest.fn().mockResolvedValue(null) };
    userRepo = { findOne: jest.fn().mockResolvedValue({ id: USER, correo: 'ana@example.com' }) };
    dataSource = { createQueryRunner: jest.fn(() => { throw REACHED_ORDER_CREATION; }) };

    service = build();
    (service as any).calcularTotalesCarrito = jest.fn().mockResolvedValue({
      subtotal: TOTAL, descuento: 0, envio: 0, totalFinal: TOTAL, cupon: null,
      cart: { items: [{ cantidad: 1, variante: { stock: 5, producto: { nombre: 'Solera' } } }] },
    });
  });

  afterEach(() => jest.restoreAllMocks());

  describe('creating a payment', () => {
    it('stamps the active store on the PaymentIntent and the checkout session', async () => {
      stripeMock.paymentIntents.create.mockResolvedValue({ id: 'pi_1', client_secret: 's' });
      stripeMock.checkout.sessions.create.mockResolvedValue({ id: 'cs_1', client_secret: 's', url: 'u' });

      await service.crearIntentoPago(USER, {} as any);
      await service.crearSesionEmbebida(USER, {} as any);

      expect(stripeMock.paymentIntents.create.mock.calls[0][0].metadata).toMatchObject({ tenantId: TENANT, usuarioId: USER });
      expect(stripeMock.checkout.sessions.create.mock.calls[0][0].metadata).toMatchObject({ tenantId: TENANT, usuarioId: USER });
    });
  });

  describe('confirmarPagoTarjeta', () => {
    const confirm = () => service.confirmarPagoTarjeta(USER, { paymentIntentId: 'pi_1' } as any);

    it('goes ahead when the payment belongs to this store, this user and this amount', async () => {
      stripeMock.paymentIntents.retrieve.mockResolvedValue(intent());

      await expect(confirm()).rejects.toBe(REACHED_ORDER_CREATION);
    });

    it('rejects a payment made for another store', async () => {
      stripeMock.paymentIntents.retrieve.mockResolvedValue(intent({}, { tenantId: 'tenant-aura' }));

      await expect(confirm()).rejects.toThrow(ForbiddenException);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('rejects a payment made by another user, even if it already has an order', async () => {
      stripeMock.paymentIntents.retrieve.mockResolvedValue(intent({}, { usuarioId: 'user-2' }));
      paymentRepo.findOne.mockResolvedValue({ notaventa: { id: 'order-of-user-2' } });

      await expect(confirm()).rejects.toThrow(ForbiddenException);
    });

    it('rejects a payment created before payments carried the store', async () => {
      stripeMock.paymentIntents.retrieve.mockResolvedValue(intent({ metadata: { usuarioId: USER } }));

      await expect(confirm()).rejects.toThrow(ForbiddenException);
    });

    it('rejects a payment whose amount is not the cart total', async () => {
      stripeMock.paymentIntents.retrieve.mockResolvedValue(intent({ amount_received: 100 }));

      await expect(confirm()).rejects.toThrow(BadRequestException);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('still auto-confirms an unconfirmed intent with the Stripe test key', async () => {
      stripeMock.paymentIntents.retrieve.mockResolvedValue(intent({ status: 'requires_confirmation' }));
      stripeMock.paymentIntents.confirm.mockResolvedValue(intent());

      await expect(confirm()).rejects.toBe(REACHED_ORDER_CREATION);
      expect(stripeMock.paymentIntents.confirm).toHaveBeenCalledWith('pi_1', { payment_method: 'pm_card_visa' });
    });

    it('does not auto-confirm an unconfirmed intent that belongs to another store or user', async () => {
      stripeMock.paymentIntents.retrieve.mockResolvedValue(
        intent({ status: 'requires_confirmation' }, { tenantId: 'tenant-aura' }),
      );

      await expect(confirm()).rejects.toThrow(ForbiddenException);
      expect(stripeMock.paymentIntents.confirm).not.toHaveBeenCalled();
    });

    it('returns the order already created for the payment instead of creating another one', async () => {
      stripeMock.paymentIntents.retrieve.mockResolvedValue(intent());
      paymentRepo.findOne.mockResolvedValue({ notaventa: { id: 'order-1' } });
      (service as any).formatearRespuestaPago = jest.fn().mockReturnValue({ orden: 'order-1' });

      await expect(confirm()).resolves.toEqual({ orden: 'order-1' });
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('never auto-confirms with a live key and rejects the unpaid intent', async () => {
      secretKey = 'sk_live_123';
      service = build();
      stripeMock.paymentIntents.retrieve.mockResolvedValue(intent({ status: 'requires_confirmation' }));

      await expect(confirm()).rejects.toThrow(BadRequestException);
      expect(stripeMock.paymentIntents.confirm).not.toHaveBeenCalled();
    });
  });

  describe('consultarEstadoSesion', () => {
    const query = () => service.consultarEstadoSesion(USER, 'cs_1');

    it('goes ahead when the session belongs to this store, this user and this amount', async () => {
      stripeMock.checkout.sessions.retrieve.mockResolvedValue(session());

      await expect(query()).rejects.toBe(REACHED_ORDER_CREATION);
    });

    it('rejects a session made for another store', async () => {
      stripeMock.checkout.sessions.retrieve.mockResolvedValue(session({}, { tenantId: 'tenant-aura' }));

      await expect(query()).rejects.toThrow(ForbiddenException);
    });

    it('rejects a session of another user without revealing its order', async () => {
      stripeMock.checkout.sessions.retrieve.mockResolvedValue(session({}, { usuarioId: 'user-2' }));
      paymentRepo.findOne.mockResolvedValue({ notaventa: { id: 'order-of-user-2' } });

      await expect(query()).rejects.toThrow(ForbiddenException);
    });

    it('rejects a session of another user even before it is paid', async () => {
      stripeMock.checkout.sessions.retrieve.mockResolvedValue(
        session({ status: 'open', payment_status: 'unpaid' }, { usuarioId: 'user-2' }),
      );

      await expect(query()).rejects.toThrow(ForbiddenException);
    });

    it('rejects a session whose amount is not the cart total', async () => {
      stripeMock.checkout.sessions.retrieve.mockResolvedValue(session({ amount_total: 100 }));

      await expect(query()).rejects.toThrow(BadRequestException);
    });

    it('still reports an unpaid session of the same user without creating an order', async () => {
      stripeMock.checkout.sessions.retrieve.mockResolvedValue(session({ status: 'open', payment_status: 'unpaid' }));

      await expect(query()).resolves.toEqual({ status: 'open', paymentStatus: 'unpaid', orden: null });
    });
  });
});
