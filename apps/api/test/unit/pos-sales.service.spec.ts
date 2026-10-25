jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderEntity } from '../../src/modules/pedidos/entities/order.entity';
import { PosSalesController } from '../../src/modules/ventas/pos-sales.controller';
import { PosSalesService } from '../../src/modules/ventas/pos-sales.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

const V1 = '11111111-1111-4111-8111-111111111111';
const V2 = '22222222-2222-4222-8222-222222222222';
const KEY = '3f9c1a52-8d7e-4b6a-9c11-2e5a7d0b4f10';

describe('PosSalesService', () => {
  let service: PosSalesService;
  let qr: any;
  let variants: Record<string, any>;
  let saved: any[];
  let locked: string[];
  let existingOrder: any;

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    variants = {
      [V1]: { id: V1, productoId: 'p1', stock: 3, precioExtra: 5, activa: true, producto: { nombre: 'Solera', precio: 100 }, talla: { nombre: 'M' }, color: { nombre: 'Rojo' } },
      [V2]: { id: V2, productoId: 'p2', stock: 1, precioExtra: 0, activa: true, producto: { nombre: 'Blusa', precio: 50 }, talla: { nombre: 'S' }, color: { nombre: 'Azul' } },
    };
    saved = [];
    locked = [];
    existingOrder = null;
    qr = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
      manager: {
        count: jest.fn().mockResolvedValue(6),
        create: jest.fn((_e, v) => ({ ...v })),
        save: jest.fn(async (...args: any[]) => {
          const value = args.length === 2 ? args[1] : args[0];
          saved.push(value);
          return Array.isArray(value) ? value : { id: 'o1', ...value };
        }),
        findOne: jest.fn(async (entity: any, opts: any) => {
          if (entity === OrderEntity) return existingOrder;
          if (opts.lock) locked.push(opts.where.id);
          return variants[opts.where.id] ? { ...variants[opts.where.id] } : null;
        }),
      },
    };
    const builder: any = { where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue({ id: 'efectivo-id' }) };
    const paymentMethodRepo = { createQueryBuilder: jest.fn().mockReturnValue(builder), findOne: jest.fn() };
    service = new PosSalesService(paymentMethodRepo as any, { createQueryRunner: () => qr } as any);
  });

  afterEach(() => jest.restoreAllMocks());

  const sell = (items: { varianteId: string; cantidad: number }[], extra: object = {}) =>
    service.registrar('seller-1', { items, ...extra } as any, KEY);

  it('registers a completed cash sale priced by the server and takes the stock', async () => {
    const result = await sell([{ varianteId: V1, cantidad: 2 }]);

    expect(result).toMatchObject({ nroOrden: expect.stringMatching(/^NV-\d{4}-00007$/), total: 210 });
    expect(result.items[0]).toMatchObject({ varianteId: V1, cantidad: 2, precio: 105, subtotal: 210 });
    expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
    const order = saved.find((s) => s.estado === 'COMPLETADO');
    expect(order).toMatchObject({ usuarioId: 'seller-1', total: 210, subtotal: 210, costoEnvio: 0 });
    expect(saved.find((s) => s.estado === 'APROBADO')).toMatchObject({ monto: 210, metodoPagoId: 'efectivo-id' });
    expect(saved.find((s) => s.stock === 1 && s.id === V1)).toBeDefined();
  });

  it('adds up repeated lines of one variant before checking the stock', async () => {
    await expect(
      sell([{ varianteId: V1, cantidad: 2 }, { varianteId: V1, cantidad: 2 }]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('locks the variants in id order so two sales cannot deadlock', async () => {
    await sell([{ varianteId: V2, cantidad: 1 }, { varianteId: V1, cantidad: 1 }]);

    expect(locked).toEqual([V1, V2]);
  });

  it('answers 409 listing every short item, rolls back and writes nothing', async () => {
    const error: any = await sell([{ varianteId: V1, cantidad: 9 }, { varianteId: V2, cantidad: 1 }]).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({
      codigo: 'STOCK_CONFLICT',
      items: [{ varianteId: V1, nombre: 'Solera', solicitado: 9, disponible: 3 }],
    });
    expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(qr.commitTransaction).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
    expect(qr.release).toHaveBeenCalledTimes(1);
  });

  it('counts a variant that no longer exists as a conflict with no stock', async () => {
    const error: any = await sell([{ varianteId: '33333333-3333-4333-8333-333333333333', cantidad: 1 }]).catch((e) => e);

    expect(error.getResponse().items).toEqual([
      expect.objectContaining({ varianteId: '33333333-3333-4333-8333-333333333333', disponible: 0, solicitado: 1 }),
    ]);
  });

  it('takes the sale date from the device but never from the future', async () => {
    const dated = () => qr.query.mock.calls.find(([sql]: [string]) => /UPDATE nota_venta SET fecha/.test(sql));
    const past = new Date(Date.now() - 3600_000).toISOString();
    await sell([{ varianteId: V2, cantidad: 1 }], { vendidoEn: past });
    expect(dated()[1]).toEqual(['o1', past]);

    qr.query.mockClear();
    variants[V2].stock = 1;
    const before = Date.now();
    await sell([{ varianteId: V2, cantidad: 1 }], { vendidoEn: new Date(before + 86_400_000).toISOString() });
    expect(new Date(dated()[1][1]).getTime()).toBeLessThan(before + 5000);
  });

  it('leaves the date to the database when the sale carries none', async () => {
    await sell([{ varianteId: V2, cantidad: 1 }]);

    expect(qr.query.mock.calls.some(([sql]: [string]) => /UPDATE nota_venta/.test(sql))).toBe(false);
  });
});

describe('PosSalesService idempotency key', () => {
  // helpers are scoped to the describe above, so rebuild a minimal service here
  let service: PosSalesService;
  let qr: any;
  let existingOrder: any;
  let saved: any[];

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    saved = [];
    existingOrder = null;
    qr = {
      connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(), release: jest.fn(), query: jest.fn(),
      manager: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn((_e, v) => ({ ...v })),
        save: jest.fn(async (...args: any[]) => {
          const value = args.length === 2 ? args[1] : args[0];
          saved.push(value);
          return Array.isArray(value) ? value : { id: 'o1', ...value };
        }),
        findOne: jest.fn(async (entity: any, opts: any) => {
          if (entity === OrderEntity) return existingOrder;
          return { id: opts.where.id, productoId: 'p', stock: 5, precioExtra: 0, activa: true, producto: { nombre: 'Solera', precio: 10 }, talla: { nombre: 'M' }, color: { nombre: 'Rojo' } };
        }),
      },
    };
    const builder: any = { where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue({ id: 'efectivo-id' }) };
    service = new PosSalesService({ createQueryBuilder: jest.fn().mockReturnValue(builder), findOne: jest.fn() } as any, { createQueryRunner: () => qr } as any);
  });

  afterEach(() => jest.restoreAllMocks());

  const stored = () => ({
    id: 'o-old', nro: 'NV-2026-00042', fecha: new Date('2026-10-25T10:00:00Z'), total: 20,
    items: [{ varianteId: V1, nombreProducto: 'Solera', talla: 'M', color: 'Rojo', cantidad: 2, precio: 10, subtotal: 20 }],
    pago: { id: 'pay-old' },
  });

  it('stores the key on the order it creates', async () => {
    await service.registrar('seller-1', { items: [{ varianteId: V1, cantidad: 1 }] } as any, KEY);

    expect(saved.find((s) => s.estado === 'COMPLETADO')).toMatchObject({ claveIdempotencia: KEY });
  });

  it('serializes executions of one key with a lock before looking anything up', async () => {
    await service.registrar('seller-1', { items: [{ varianteId: V1, cantidad: 1 }] } as any, KEY);

    expect(qr.query.mock.calls[0][0]).toMatch(/pg_advisory_xact_lock/);
    expect(qr.query.mock.calls[0][1][0]).toContain(KEY);
  });

  it('answers with the order already registered under the key and takes no stock again', async () => {
    existingOrder = stored();

    const result = await service.registrar('seller-1', { items: [{ varianteId: V1, cantidad: 2 }] } as any, KEY);

    expect(result).toMatchObject({ ordenId: 'o-old', nroOrden: 'NV-2026-00042', total: 20, pago: { id: 'pay-old' } });
    expect(result.items).toEqual([expect.objectContaining({ varianteId: V1, cantidad: 2, subtotal: 20 })]);
    expect(saved).toHaveLength(0);
    expect(qr.manager.findOne.mock.calls.some(([, o]: any[]) => o.lock)).toBe(false);
  });

  it('returns the existing order when the unique index on the key rejects a concurrent insert', async () => {
    const duplicate: any = new Error('duplicate key value violates unique constraint "uq_nota_venta_clave"');
    duplicate.code = '23505';
    qr.manager.save.mockRejectedValueOnce(duplicate);
    qr.manager.findOne.mockImplementation(async (entity: any, opts: any) => {
      if (entity === OrderEntity) return qr.manager.save.mock.calls.length ? stored() : null;
      return { id: opts.where.id, productoId: 'p', stock: 5, precioExtra: 0, activa: true, producto: { nombre: 'Solera', precio: 10 }, talla: { nombre: 'M' }, color: { nombre: 'Rojo' } };
    });

    const result = await service.registrar('seller-1', { items: [{ varianteId: V1, cantidad: 2 }] } as any, KEY);

    expect(result).toMatchObject({ ordenId: 'o-old' });
    expect(qr.rollbackTransaction).toHaveBeenCalled();
  });
});

describe('PosSalesController', () => {
  it('refuses a sale without Idempotency-Key, since a retry would duplicate it', () => {
    const controller = new PosSalesController({ registrar: jest.fn() } as any);

    expect(() => controller.registrar('seller-1', {} as any, undefined)).toThrow(BadRequestException);
  });
});
