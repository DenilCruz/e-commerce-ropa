jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

import { ConflictException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/pagos/payments.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('PaymentsService stock conflict', () => {
  let service: PaymentsService;
  let queryRunner: any;

  const cartWith = (stock: number) => ({
    cart: { items: [{ varianteId: 'v1', cantidad: 2, variante: { stock, producto: { nombre: 'Solera' } } }] },
    subtotal: 10, descuento: 0, envio: 0, totalFinal: 10, cupon: null,
  });

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    const none = {} as any;
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn((_e, v) => v),
        save: jest.fn(async (v) => ({ id: 'o1', ...v })),
        findOne: jest.fn(),
      },
    };
    const orderRepo = { count: jest.fn().mockResolvedValue(0) };
    const dataSource = { createQueryRunner: () => queryRunner };

    service = new PaymentsService(
      none, none, orderRepo as any, none, none, none, none, none, none, none, none, none,
      none, none, dataSource as any, { get: () => undefined } as any,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('answers 409 when the cart asks for more than the stock shown', async () => {
    jest.spyOn(service as any, 'calcularTotalesCarrito').mockResolvedValue(cartWith(1));

    await expect(service.pagoContraEntrega('user-1', {} as any)).rejects.toBeInstanceOf(ConflictException);
    expect(queryRunner.connect).not.toHaveBeenCalled();
  });

  it('answers 409 and rolls back when the locked stock ran out meanwhile', async () => {
    jest.spyOn(service as any, 'calcularTotalesCarrito').mockResolvedValue(cartWith(5));
    queryRunner.manager.findOne.mockResolvedValue({ id: 'v1', stock: 1 });

    await expect(service.pagoContraEntrega('user-1', {} as any)).rejects.toBeInstanceOf(ConflictException);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });
});
