jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/pagos/payments.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('PaymentsService totals: shipping and coupons', () => {
  const ESTANDAR = { id: 'e0000000-0000-4000-8000-000000000001', nombre: 'Envío Estándar Atelier', costo: 15, activo: true };
  const EXPRESS = { id: 'e0000000-0000-4000-8000-000000000002', nombre: 'Envío Express Prioritario', costo: 30, activo: true };
  const INACTIVO = { id: 'e0000000-0000-4000-8000-000000000003', nombre: 'Moto', costo: 5, activo: false };

  let metodos: any[];
  let cartItems: any[];
  let cupones: any[];
  let usosDelUsuario: number;
  let service: PaymentsService;

  const totals = (opts: { cupon?: string; metodo?: string; tipo?: string; yaCobrado?: boolean } = {}) =>
    (service as any).calcularTotalesCarrito('user-1', opts.cupon, opts.metodo, opts.tipo, opts.yaCobrado ? { posteriorAlCobro: true } : {});

  const item = (precio: number, cantidad = 1) => ({ precioUnitario: precio, cantidad });
  const cuponValido = (extra: any = {}) => ({
    id: 'c0000000-0000-4000-8000-000000000001',
    codigo: 'VERANO',
    tipo: 'PORCENTAJE',
    valor: 10,
    activo: true,
    fechaInicio: new Date(Date.now() - 86_400_000),
    fechaFin: new Date(Date.now() + 86_400_000),
    usosMaximos: null,
    usosActuales: 0,
    montoMinimo: 0,
    usosPorUsuario: 1,
    ...extra,
  });

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    metodos = [ESTANDAR, EXPRESS, INACTIVO];
    cartItems = [];
    cupones = [];
    usosDelUsuario = 0;
    const none = {} as any;
    const cartRepo = { findOne: jest.fn(async () => ({ items: cartItems })) };
    const couponRepo = { findOne: jest.fn(async ({ where }) => cupones.find((c) => c.id === where.id) ?? null) };
    const shippingMethodRepo = {
      findOne: jest.fn(async ({ where }) => metodos.find((m) => m.id === where.id && (where.activo === undefined || m.activo === where.activo)) ?? null),
      find: jest.fn(async ({ where }) => metodos.filter((m) => where.activo === undefined || m.activo === where.activo)),
    };
    const dataSource = { getRepository: () => ({ count: jest.fn(async () => usosDelUsuario) }) };

    service = new PaymentsService(
      none, none, none, none, none, none, cartRepo as any, none, couponRepo as any, none, none, shippingMethodRepo as any,
      none, none, dataSource as any, { get: () => undefined } as any,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('shipping method', () => {
    it('rejects a method that does not exist with a clear 400', async () => {
      await expect(totals({ metodo: 'e9999999-0000-4000-8000-000000000009' })).rejects.toThrow(BadRequestException);
    });

    it('rejects a method the store has switched off', async () => {
      await expect(totals({ metodo: INACTIVO.id })).rejects.toThrow(/no existe o no está disponible/);
    });

    it('rejects an id that is not a UUID without asking the database', async () => {
      await expect(totals({ metodo: "1' OR '1'='1" })).rejects.toThrow(BadRequestException);
    });

    it('ships nothing and needs no method when the cart is empty', async () => {
      await expect(totals()).resolves.toMatchObject({ envio: 0, totalFinal: 0, metodoEnvio: null });
    });

    it('charges the cost the store configured, not a fixed number', async () => {
      cartItems = [item(50)];
      metodos = [{ ...ESTANDAR, costo: 22.5 }, EXPRESS];
      await expect(totals({ tipo: 'ESTANDAR' })).resolves.toMatchObject({ envio: 22.5, totalFinal: 72.5 });
    });

    it('makes standard shipping free from the threshold', async () => {
      cartItems = [item(120, 2)];
      await expect(totals({ tipo: 'ESTANDAR' })).resolves.toMatchObject({ envio: 0, totalFinal: 240 });
    });

    it('picks the express method by type when the client names none', async () => {
      cartItems = [item(500)];
      const t = await totals({ tipo: 'EXPRESS' });
      expect(t.metodoEnvio.id).toBe(EXPRESS.id);
      expect(t.envio).toBe(30);
    });

    it('lets the method win over a type that disagrees, so express cannot be bought at the standard price', async () => {
      cartItems = [item(500)];
      const t = await totals({ metodo: EXPRESS.id, tipo: 'ESTANDAR' });
      expect(t.envio).toBe(30);
    });

    it('refuses to price an order when the store has no shipping methods', async () => {
      cartItems = [item(50)];
      metodos = [];
      await expect(totals()).rejects.toThrow(/aún no tiene métodos de envío/);
    });
  });

  describe('coupon', () => {
    beforeEach(() => {
      cartItems = [item(100)];
    });

    it('applies a valid coupon to the total', async () => {
      cupones = [cuponValido()];
      await expect(totals({ cupon: cupones[0].id, metodo: ESTANDAR.id })).resolves.toMatchObject({
        descuento: 10,
        totalFinal: 105,
      });
    });

    it('rejects an unknown coupon instead of silently ignoring it', async () => {
      await expect(totals({ cupon: 'c9999999-0000-4000-8000-000000000009' })).rejects.toThrow(/no existe o no es válido/);
    });

    it('rejects an expired coupon even when its id is sent straight to the payment', async () => {
      cupones = [cuponValido({ fechaFin: new Date(Date.now() - 1000) })];
      await expect(totals({ cupon: cupones[0].id })).rejects.toThrow(/expirado/);
    });

    it('rejects a coupon whose global limit is used up', async () => {
      cupones = [cuponValido({ usosMaximos: 5, usosActuales: 5 })];
      await expect(totals({ cupon: cupones[0].id })).rejects.toThrow(/límite máximo/);
    });

    it('rejects a purchase under the coupon minimum', async () => {
      cupones = [cuponValido({ montoMinimo: 500 })];
      await expect(totals({ cupon: cupones[0].id })).rejects.toThrow(/monto mínimo/);
    });

    it('rejects a user who already used the coupon as many times as allowed', async () => {
      cupones = [cuponValido()];
      usosDelUsuario = 1;
      await expect(totals({ cupon: cupones[0].id })).rejects.toThrow(/límite permitido por usuario/);
    });
  });

  describe('after the gateway has already charged the customer', () => {
    beforeEach(() => {
      cartItems = [item(100)];
    });

    it('still prices the order with a coupon that expired while the customer was paying', async () => {
      cupones = [cuponValido({ fechaFin: new Date(Date.now() - 1000) })];
      await expect(totals({ cupon: cupones[0].id, metodo: ESTANDAR.id, yaCobrado: true })).resolves.toMatchObject({
        descuento: 10,
        totalFinal: 105,
      });
    });

    it('still prices the order when the coupon limit filled up or the user already used it', async () => {
      cupones = [cuponValido({ usosMaximos: 1, usosActuales: 1 })];
      usosDelUsuario = 3;
      await expect(totals({ cupon: cupones[0].id, metodo: ESTANDAR.id, yaCobrado: true })).resolves.toMatchObject({ descuento: 10 });
    });

    it('keeps a shipping method the store switched off mid-checkout', async () => {
      const t = await totals({ metodo: INACTIVO.id, yaCobrado: true });
      expect(t.metodoEnvio.id).toBe(INACTIVO.id);
    });

    it('is still strict before the money moves', async () => {
      cupones = [cuponValido({ fechaFin: new Date(Date.now() - 1000) })];
      await expect(totals({ cupon: cupones[0].id })).rejects.toThrow(/expirado/);
    });
  });
});
