jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

const stripeMock: any = {
  paymentIntents: { create: jest.fn(), retrieve: jest.fn(), confirm: jest.fn() },
  checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
};
jest.mock('stripe', () => jest.fn().mockImplementation(() => stripeMock));

import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/pagos/payments.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('PaymentsService: a paid Checkout session creates its order exactly once', () => {
  const TENANT = 'tenant-luna';
  const USER = 'user-1';
  const TOTAL = 150;

  let service: PaymentsService;
  let paymentRepo: any;
  let qr: any;
  let dataSource: any;
  let existente: any;

  const session = (over: Record<string, unknown> = {}, metadata: Record<string, string> = {}) =>
    ({
      id: 'cs_1',
      status: 'complete',
      payment_status: 'paid',
      payment_intent: 'pi_1',
      amount_total: TOTAL * 100,
      currency: 'bob',
      metadata: { tenantId: TENANT, usuarioId: USER, ...metadata },
      ...over,
    }) as any;

  const build = () => {
    const none = {} as any;
    return new PaymentsService(
      paymentRepo, none, { count: jest.fn().mockResolvedValue(0) } as any, none, none, none, none, none, none, none, none, none, none, none, dataSource,
      { get: (key: string) => (key === 'STRIPE_SECRET_KEY' ? 'sk_test_123' : undefined) } as any,
    );
  };

  const guardados = () => qr.manager.save.mock.calls.length;

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue(TENANT);
    jest.clearAllMocks();
    existente = { id: 'pago-1', notaventa: { id: 'orden-1', nro: 'NV-2026-00001' } };
    paymentRepo = { findOne: jest.fn().mockResolvedValue(null) };
    qr = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn().mockResolvedValue([]),
      manager: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((_entidad: unknown, datos: any) => ({ ...datos })),
        save: jest.fn(async (...args: any[]) => (args.length === 1 ? args[0] : { id: 'guardado', ...args[0] })),
        increment: jest.fn(),
        delete: jest.fn(),
      },
    };
    dataSource = { createQueryRunner: jest.fn(() => qr) };

    service = build();
    (service as any).calcularTotalesCarrito = jest.fn().mockResolvedValue({
      subtotal: TOTAL, descuento: 0, envio: 0, totalFinal: TOTAL, cupon: null, cart: { id: 'cart-1', items: [] },
    });
    (service as any).resolverMetodoPagoId = jest.fn().mockResolvedValue('mp-1');
    (service as any).enviarConfirmacionEmailSeguro = jest.fn();
    (service as any).formatearRespuestaPago = jest.fn((orden: any) => ({ id: orden.id, nro: orden.nro }));
  });

  afterEach(() => jest.restoreAllMocks());

  describe('completarPedidoDeSesion', () => {
    it('toma un bloqueo por sesión antes de escribir nada', async () => {
      await service.completarPedidoDeSesion(USER, session());

      const [sql, params] = qr.query.mock.calls[0];
      expect(sql).toMatch(/pg_advisory_xact_lock/);
      expect(params[0]).toContain('cs_1');
      expect(qr.query.mock.invocationCallOrder[0]).toBeLessThan(qr.manager.save.mock.invocationCallOrder[0]);
      expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('si otro ya registró el pago mientras esperaba el bloqueo, devuelve ese pedido y no escribe nada', async () => {
      qr.manager.findOne.mockResolvedValue(existente);

      const r = await service.completarPedidoDeSesion(USER, session());

      expect(r.orden).toEqual({ id: 'orden-1', nro: 'NV-2026-00001' });
      expect(guardados()).toBe(0);
      expect(qr.commitTransaction).not.toHaveBeenCalled();
      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.release).toHaveBeenCalled();
    });

    it('si el pedido ya existía antes de empezar, ni abre una transacción', async () => {
      paymentRepo.findOne.mockResolvedValue(existente);

      const r = await service.completarPedidoDeSesion(USER, session());

      expect(r.orden).toEqual({ id: 'orden-1', nro: 'NV-2026-00001' });
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('última barrera: si el índice único rechaza el pago, devuelve el pedido que ganó en vez de fallar', async () => {
      qr.manager.save.mockImplementation(async (...args: any[]) => {
        const dato = args.length === 1 ? args[0] : args[0];
        if (dato?.idTransaccion) throw Object.assign(new Error('duplicate key'), { code: '23505' });
        return args.length === 1 ? args[0] : { id: 'guardado', ...dato };
      });
      paymentRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existente);

      const r = await service.completarPedidoDeSesion(USER, session());

      expect(r.orden).toEqual({ id: 'orden-1', nro: 'NV-2026-00001' });
      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.commitTransaction).not.toHaveBeenCalled();
    });

    it('una sesión sin cobrar no crea nada', async () => {
      const r = await service.completarPedidoDeSesion(USER, session({ status: 'open', payment_status: 'unpaid' }));

      expect(r.orden).toBeNull();
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });
  });

  describe('completarPedidoDesdeWebhook', () => {
    it('no hace nada con un pago que aún no está cobrado', async () => {
      expect(await service.completarPedidoDesdeWebhook(session({ payment_status: 'unpaid' }))).toBe('PENDIENTE');
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('una sesión sin tienda o usuario en la metadata no es de un pedido nuestro', async () => {
      expect(await service.completarPedidoDesdeWebhook(session({ metadata: {} }))).toBe('HUERFANO');
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('crea el pedido bajo la tienda y el usuario del pago, sin sesión propia', async () => {
      const vistas: Array<string | undefined> = [];
      (service as any).calcularTotalesCarrito.mockImplementation(async () => {
        vistas.push(TenantContext.get(), TenantContext.getUser());
        return { subtotal: TOTAL, descuento: 0, envio: 0, totalFinal: TOTAL, cupon: null, cart: { id: 'cart-1', items: [] } };
      });
      jest.restoreAllMocks();
      jest.spyOn(TenantContext, 'require').mockImplementation(() => TenantContext.get() as string);

      const r = await TenantContext.runAs('otra-tienda', 'otro-usuario', () => service.completarPedidoDesdeWebhook(session()));

      expect(r).toBe('PROCESADO');
      expect(vistas).toEqual([TENANT, USER]);
    });

    it('un evento repetido sobre un pedido ya creado responde DUPLICADO sin escribir', async () => {
      paymentRepo.findOne.mockResolvedValue(existente);

      expect(await service.completarPedidoDesdeWebhook(session())).toBe('DUPLICADO');
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('si no se puede completar por una razón de negocio (sin stock, carrito cambiado) lo deja como huérfano para revisar, sin reintentos', async () => {
      (service as any).calcularTotalesCarrito.mockRejectedValue(new BadRequestException('Tu carrito está vacío.'));
      expect(await service.completarPedidoDesdeWebhook(session())).toBe('HUERFANO');

      (service as any).calcularTotalesCarrito.mockResolvedValue({
        subtotal: TOTAL, descuento: 0, envio: 0, totalFinal: TOTAL, cupon: null,
        cart: { id: 'cart-1', items: [{ varianteId: 'v1', cantidad: 3 }] },
      });
      // no hay pedido ganador, pero la prenda tiene 1 unidad y el carrito pide 3
      qr.manager.findOne.mockImplementation(async (entidad: any) => (entidad?.name === 'PaymentEntity' ? null : { stock: 1 }));
      expect(await service.completarPedidoDesdeWebhook(session())).toBe('HUERFANO');
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('un fallo transitorio de la base se relanza como 5xx para que Stripe reintente', async () => {
      qr.manager.save.mockRejectedValue(Object.assign(new Error('deadlock detected'), { code: '40P01' }));

      await expect(service.completarPedidoDesdeWebhook(session())).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('un fallo de conexión sin código también se reintenta', async () => {
      qr.manager.save.mockRejectedValue(new Error('Connection terminated unexpectedly'));

      await expect(service.completarPedidoDesdeWebhook(session())).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('una violación de integridad (clave foránea, dato inválido) es permanente: se deja huérfano sin reintentos', async () => {
      qr.manager.save.mockRejectedValue(Object.assign(new Error('violates foreign key constraint "envio_metodo_envio_id_fkey"'), { code: '23503' }));
      expect(await service.completarPedidoDesdeWebhook(session())).toBe('HUERFANO');

      qr.manager.save.mockRejectedValue(Object.assign(new Error('invalid input syntax'), { code: '22P02' }));
      expect(await service.completarPedidoDesdeWebhook(session())).toBe('HUERFANO');
    });
  });
});
