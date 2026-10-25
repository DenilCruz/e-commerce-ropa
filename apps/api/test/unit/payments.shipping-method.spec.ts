jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/pagos/payments.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('PaymentsService shipping method validation', () => {
  const KNOWN_METHOD = 'e1000000-0000-0000-0000-000000000001';
  let shippingMethodRepo: any;
  let service: PaymentsService;

  const totals = (metodoEnvioId?: string) =>
    (service as any).calcularTotalesCarrito('user-1', undefined, metodoEnvioId, 'ESTANDAR');

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    const none = {} as any;
    const cartRepo = { findOne: jest.fn().mockResolvedValue({ items: [] }) };
    shippingMethodRepo = { count: jest.fn(({ where }) => Promise.resolve(where.id === KNOWN_METHOD ? 1 : 0)) };

    service = new PaymentsService(
      none, none, none, none, none, none, cartRepo as any, none, none, none, none, shippingMethodRepo,
      none, none, none, { get: () => undefined } as any,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('rejects a shipping method that does not exist with a clear 400', async () => {
    await expect(totals('e9999999-0000-0000-0000-000000000009')).rejects.toThrow(BadRequestException);
  });

  it('accepts an existing shipping method', async () => {
    await expect(totals(KNOWN_METHOD)).resolves.toMatchObject({ totalFinal: 0 });
  });

  it('does not look the method up when the request has none', async () => {
    await expect(totals(undefined)).resolves.toBeDefined();
    expect(shippingMethodRepo.count).not.toHaveBeenCalled();
  });
});
