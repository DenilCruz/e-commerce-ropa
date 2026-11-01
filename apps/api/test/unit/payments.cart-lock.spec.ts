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
