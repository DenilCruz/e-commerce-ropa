jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/pagos/payments.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('PaymentsService cart lock', () => {
  let service: PaymentsService;
  let manager: { query: jest.Mock; count: jest.Mock };

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    const none = {} as any;
    manager = { query: jest.fn().mockResolvedValue([]), count: jest.fn() };
    service = new PaymentsService(none, none, none, none, none, none, none, none, none, none, none, none, none, none, none, { get: () => undefined } as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('takes a lock for the store and the user before looking at the cart', async () => {
    manager.count.mockResolvedValue(2);
    await (service as any).bloquearCarrito(manager, 'user-1', 'cart-1');
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), ['carrito:tenant-luna:user-1']);
    expect(manager.query.mock.invocationCallOrder[0]).toBeLessThan(manager.count.mock.invocationCallOrder[0]);
  });

  it('lets the payment go on while the cart still has items', async () => {
    manager.count.mockResolvedValue(1);
    await expect((service as any).bloquearCarrito(manager, 'user-1', 'cart-1')).resolves.toBeUndefined();
  });

  it('refuses a second payment of a cart the first one already emptied', async () => {
    manager.count.mockResolvedValue(0);
    await expect((service as any).bloquearCarrito(manager, 'user-1', 'cart-1')).rejects.toThrow(BadRequestException);
    await expect((service as any).bloquearCarrito(manager, 'user-1', 'cart-1')).rejects.toThrow(/ya se procesó/);
  });
});

describe('PaymentsService payment answer', () => {
  it('names the real payment method of a freshly saved payment instead of guessing it from the receipt', async () => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    const none = {} as any;
    const metodoRepo = { findOne: jest.fn().mockResolvedValue({ id: 'm-qr', nombre: 'QR Simple / Transferencia' }) };
    const service = new PaymentsService(none, metodoRepo as any, none, none, none, none, none, none, none, none, none, none, none, none, none, { get: () => undefined } as any);

    const pago = await (service as any).conMetodoPago({ id: 'p1', metodoPagoId: 'm-qr', idTransaccion: 'QR-ABC123' });

    expect(pago.metodoPago.nombre).toBe('QR Simple / Transferencia');
    expect((service as any).formatearRespuestaPago({ items: [] }, pago).pago.metodoPago).toBe('QR Simple / Transferencia');
    jest.restoreAllMocks();
  });
});
