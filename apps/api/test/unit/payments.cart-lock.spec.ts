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

describe('PaymentsService coupon redemption', () => {
  const cupon: any = { id: 'c1', codigo: 'VERANO' };
  const lleno = { id: 'c1', codigo: 'VERANO', activo: true, fechaInicio: new Date(0), fechaFin: new Date(Date.now() + 1e9), usosMaximos: 1, usosActuales: 1, montoMinimo: 0, usosPorUsuario: 1 };
  let service: PaymentsService;
  let manager: any;

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    const none = {} as any;
    manager = {
      findOne: jest.fn().mockResolvedValue(lleno),
      count: jest.fn().mockResolvedValue(0),
      increment: jest.fn(),
      create: jest.fn((_e: unknown, v: any) => v),
      save: jest.fn(),
    };
    service = new PaymentsService(none, none, none, none, none, none, none, none, none, none, none, none, none, none, none, { get: () => undefined } as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('refuses a coupon whose limit is used up when the payment has not been taken yet', async () => {
    await expect((service as any).registrarUsoCupon(manager, cupon, 'u1', 'o1', 100)).rejects.toThrow(/límite máximo/);
    expect(manager.increment).not.toHaveBeenCalled();
  });

  it('only records the use when the customer has already paid, so the order is never refused', async () => {
    await expect((service as any).registrarUsoCupon(manager, cupon, 'u1', 'o1', 100, false)).resolves.toBeUndefined();
    expect(manager.increment).toHaveBeenCalledTimes(1);
    expect(manager.save).toHaveBeenCalledTimes(1);
  });

  it('does not fail a paid order if the coupon row disappeared', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect((service as any).registrarUsoCupon(manager, cupon, 'u1', 'o1', 100, false)).resolves.toBeUndefined();
  });
});

describe('PaymentsService QR availability and method lookup', () => {
  const build = (extra: { query?: jest.Mock; metodos?: any[] } = {}) => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    const none = {} as any;
    const methodRepo = { find: jest.fn().mockResolvedValue(extra.metodos ?? []) };
    const dataSource = { query: extra.query ?? jest.fn().mockResolvedValue([]) };
    return new PaymentsService(none, methodRepo as any, none, none, none, none, none, none, none, none, none, none, none, none, dataSource as any, { get: () => undefined } as any);
  };

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.PLATFORM_PAYMENT_QR_URL;
    delete process.env.PLATFORM_PAYMENT_HOLDER;
    delete process.env.PLATFORM_PAYMENT_BANK;
  });

  it('refuses a QR order when neither the store nor the platform has a QR', async () => {
    const service = build({ query: jest.fn().mockResolvedValue([{ qr_url: '' }]) });
    await expect(service.pagoQr('user-1', {} as any)).rejects.toThrow(/aún no tiene el pago por QR/);
  });

  it('accepts the store having its own QR', async () => {
    const service = build({ query: jest.fn().mockResolvedValue([{ qr_url: '/uploads/pagos/qr.webp' }]) });
    expect(await (service as any).qrDisponible()).toBe(true);
  });

  it('accepts the platform account as the QR of a store that has none', async () => {
    process.env.PLATFORM_PAYMENT_QR_URL = '/uploads/plataforma/qr.webp';
    process.env.PLATFORM_PAYMENT_HOLDER = 'Plataforma';
    process.env.PLATFORM_PAYMENT_BANK = 'Banco';
    const service = build({ query: jest.fn().mockResolvedValue([{ qr_url: null }]) });
    expect(await (service as any).qrDisponible()).toBe(true);
  });

  it('finds the card method even when the store named it after a brand', async () => {
    const service = build({ metodos: [{ id: 'm-cash', nombre: 'Efectivo contra entrega' }, { id: 'm-visa', nombre: 'Visa / Mastercard' }] });
    expect(await (service as any).resolverMetodoPagoId('tarjeta')).toBe('m-visa');
  });

  it('never gives the card payment to the QR or cash methods', async () => {
    const service = build({ metodos: [{ id: 'm-qr', nombre: 'QR Simple / Transferencia' }, { id: 'm-cash', nombre: 'Efectivo contra entrega' }] });
    await expect((service as any).resolverMetodoPagoId('tarjeta')).rejects.toThrow(/no está disponible/);
  });
});
