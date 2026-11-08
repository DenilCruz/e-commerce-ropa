jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, ConflictException, ForbiddenException, HttpException } from '@nestjs/common';
import { BillingService } from '../../src/modules/facturacion/billing.service';
import { PLANES_CONFIG } from '../../src/modules/tiendas/plan-limits.service';

const TENANT = 'a0a0a0a0-0000-4000-8000-000000000001';
const NUEVA_TIENDA = 'b1b1b1b1-0000-4000-8000-000000000002';
const USER = 'user-1';
const SESION_ALTA = 'cs_test_alta';
const SUB = 'sub_123';

const evento = (tipo: string, objeto: unknown, id = 'evt_1') => ({ id, type: tipo, data: { object: objeto } }) as any;

const altaPendiente = (extra: Record<string, unknown> = {}) => ({
  id: 'alta-1',
  usuario_id: USER,
  nombre: 'Moda Luna',
  plan: 'ESTANDAR',
  periodo: 'MENSUAL',
  monto: String(PLANES_CONFIG.ESTANDAR.precioMensual),
  moneda: 'usd',
  estado: 'PENDIENTE_PAGO',
  ...extra,
});

const sesionAltaPagada = (extra: Record<string, unknown> = {}) => ({
  id: SESION_ALTA,
  payment_status: 'paid',
  amount_total: PLANES_CONFIG.ESTANDAR.precioMensual * 100,
  currency: 'usd',
  subscription: SUB,
  customer: 'cus_123',
  metadata: { tipo: 'ALTA_TIENDA', altaId: 'alta-1', usuarioId: USER, nombre: 'Moda Luna', plan: 'ESTANDAR', periodo: 'MENSUAL' },
  ...extra,
});

const factura = (extra: Record<string, unknown> = {}) => ({
  id: 'in_1',
  billing_reason: 'subscription_cycle',
  amount_paid: PLANES_CONFIG.ESTANDAR.precioMensual * 100,
  currency: 'usd',
  parent: { subscription_details: { subscription: SUB } },
  lines: { data: [{ period: { end: 1900000000 } }] },
  ...extra,
});

describe('BillingService: alta de tienda al pagar y ciclo de vida de la suscripción', () => {
  let service: BillingService;
  let qr: any;
  let dataSource: any;
  let planLimits: any;
  let stores: any;
  let stripeFalso: any;
  let bd: {
    usuario: any;
    pendientes: number;
    alta: any | null;
    eventoNuevo: boolean;
    marcada: boolean;
    tiendaDeSub: string | null;
    suscripcionActiva: any | null;
    anteriores: any[];
  };

  /** Runs a store provisioning the way StoresService does: the callback runs inside the same transaction. */
  const crearPagadaReal = async (_u: string, _n: string, _p: string, dentro: (qr: any, t: any) => Promise<void>) => {
    await dentro(qr, { id: NUEVA_TIENDA });
    return { id: NUEVA_TIENDA };
  };

  beforeEach(() => {
    bd = {
      usuario: { correo: 'ana@correo.com', email_verificado: true },
      pendientes: 0,
      alta: altaPendiente(),
      eventoNuevo: true,
      marcada: true,
      tiendaDeSub: TENANT,
      suscripcionActiva: { id: 'sus-1', monto: String(PLANES_CONFIG.ESTANDAR.precioMensual), moneda: 'usd' },
      anteriores: [],
    };
    qr = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn(async (sql: string) => {
        if (/UPDATE alta_tienda/.test(sql)) return bd.marcada ? [{ id: 'alta-1' }] : [];
        if (/INSERT INTO evento_webhook/.test(sql)) return bd.eventoNuevo ? [{ stripe_event_id: 'evt_1' }] : [];
        if (/FROM suscripcion WHERE stripe_subscription_id/.test(sql)) return bd.suscripcionActiva ? [bd.suscripcionActiva] : [];
        return [];
      }),
    };
    dataSource = {
      createQueryRunner: jest.fn(() => qr),
      query: jest.fn(async (sql: string) => {
        if (/FROM usuario/.test(sql)) return bd.usuario ? [bd.usuario] : [];
        if (/count\(\*\)::int AS pendientes/.test(sql)) return [{ pendientes: bd.pendientes }];
        if (/FROM alta_tienda a LEFT JOIN/.test(sql)) return bd.alta ? [{ ...bd.alta, tienda_id: null }] : [];
        if (/SELECT \* FROM alta_tienda/.test(sql)) return bd.alta ? [bd.alta] : [];
        if (/FROM suscripcion_stripe/.test(sql)) return bd.tiendaDeSub ? [{ tienda_id: bd.tiendaDeSub }] : [];
        if (/INSERT INTO evento_webhook/.test(sql)) return bd.eventoNuevo ? [{ stripe_event_id: 'evt_1' }] : [];
        if (/stripe_subscription_id IS NOT NULL AND stripe_session_id <>/.test(sql)) return bd.anteriores;
        if (/SELECT id, stripe_subscription_id, cancelar_al_vencer/.test(sql)) return [{ id: 'sus-1', stripe_subscription_id: SUB, cancelar_al_vencer: false }];
        if (/SELECT plan, periodo, monto, moneda, vence_en, cancelar_al_vencer/.test(sql)) return [];
        return [];
      }),
    };
    planLimits = { verificarAdministradorDeTienda: jest.fn().mockResolvedValue({ id: TENANT }), obtenerPlanEfectivo: jest.fn().mockResolvedValue('FREE_TRIAL') };
    stores = { crearPagada: jest.fn(crearPagadaReal) };
    const config = { get: jest.fn((k: string) => ({ PLAN_PAYMENT_MODE: 'stripe', STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: 'whsec_x', APP_URL: 'http://localhost:5173' })[k]) };

    service = new BillingService(dataSource, config as any, planLimits, stores);
    stripeFalso = {
      checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: SESION_ALTA, url: 'https://checkout.stripe.com/c/pay/cs_test_alta' }) } },
      subscriptions: { update: jest.fn().mockResolvedValue({}), cancel: jest.fn().mockResolvedValue({}) },
    };
    (service as any).stripe = Object.assign((service as any).stripe, stripeFalso);
  });

  const consultasQr = () => qr.query.mock.calls.map(([sql, params]: [string, unknown[]]) => ({ sql, params }));
  const consultasDs = () => dataSource.query.mock.calls.map(([sql, params]: [string, unknown[]]) => ({ sql, params }));

  describe('crearAltaTienda', () => {
    it('abre una suscripción de Stripe y guarda el alta PENDIENTE_PAGO sin crear ninguna tienda', async () => {
      const r = await service.crearAltaTienda(USER, '  Moda Luna ', 'ESTANDAR', 'MENSUAL');

      const args = stripeFalso.checkout.sessions.create.mock.calls[0][0];
      expect(args.mode).toBe('subscription');
      expect(args.line_items[0].price_data.recurring).toEqual({ interval: 'month' });
      expect(args.line_items[0].price_data.unit_amount).toBe(PLANES_CONFIG.ESTANDAR.precioMensual * 100);
      expect(args.metadata).toMatchObject({ tipo: 'ALTA_TIENDA', usuarioId: USER, nombre: 'Moda Luna', plan: 'ESTANDAR' });
      expect(args.success_url).toContain('/planes/retorno?session_id={CHECKOUT_SESSION_ID}');
      expect(r.url).toContain('checkout.stripe.com');

      const insert = consultasDs().find((c: { sql: string }) => /INSERT INTO alta_tienda/.test(c.sql));
      expect(insert.params).toEqual(expect.arrayContaining([USER, 'Moda Luna', 'ESTANDAR', 'MENSUAL', SESION_ALTA]));
      expect(stores.crearPagada).not.toHaveBeenCalled();
    });

    it('rechaza un plan que no se vende, un nombre corto y un correo sin verificar sin llamar a Stripe', async () => {
      await expect(service.crearAltaTienda(USER, 'Moda Luna', 'FREE_TRIAL', 'MENSUAL')).rejects.toThrow(BadRequestException);
      await expect(service.crearAltaTienda(USER, 'ab', 'ESTANDAR', 'MENSUAL')).rejects.toThrow(/entre 3 y 100/);
      bd.usuario = { correo: 'ana@correo.com', email_verificado: false };
      await expect(service.crearAltaTienda(USER, 'Moda Luna', 'ESTANDAR', 'MENSUAL')).rejects.toThrow(ForbiddenException);
      expect(stripeFalso.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('corta con 429 a quien acumula pagos pendientes', async () => {
      bd.pendientes = 5;

      const intento = service.crearAltaTienda(USER, 'Moda Luna', 'ESTANDAR', 'MENSUAL');

      await expect(intento).rejects.toBeInstanceOf(HttpException);
      await expect(intento).rejects.toMatchObject({ status: 429 });
      expect(stripeFalso.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });

  describe('confirmarAltaTienda (webhook)', () => {
    it('crea la tienda con el plan pagado y deja suscripción, índice de Stripe y alta ACTIVADA en la misma transacción', async () => {
      const r = await service.procesarEvento(evento('checkout.session.completed', sesionAltaPagada()));

      expect(r).toBe('PROCESADO');
      expect(stores.crearPagada).toHaveBeenCalledWith(USER, 'Moda Luna', 'ESTANDAR', expect.any(Function));
      const sqls = consultasQr().map((c: { sql: string }) => c.sql).join('\n');
      expect(sqls).toMatch(/UPDATE alta_tienda SET estado = 'ACTIVADA'/);
      expect(sqls).toMatch(/INSERT INTO evento_webhook/);
      expect(sqls).toMatch(/INSERT INTO suscripcion[\s\S]*'ACTIVA'/);
      const indice = consultasQr().find((c: { sql: string }) => /INSERT INTO suscripcion_stripe/.test(c.sql));
      expect(indice.params).toEqual([SUB, NUEVA_TIENDA]);
      const sus = consultasQr().find((c: { sql: string }) => /INSERT INTO suscripcion \(/.test(c.sql));
      expect(sus.params).toEqual(expect.arrayContaining([NUEVA_TIENDA, USER, 'ESTANDAR', 'MENSUAL', SESION_ALTA, SUB, 'cus_123']));
    });

    it('un pago sin cobrar todavía no crea nada', async () => {
      const r = await service.procesarEvento(evento('checkout.session.completed', sesionAltaPagada({ payment_status: 'unpaid' })));

      expect(r).toBe('PENDIENTE');
      expect(stores.crearPagada).not.toHaveBeenCalled();
    });

    it('un monto o moneda distintos al alta rechazan el pago y no crean la tienda', async () => {
      const r = await service.procesarEvento(evento('checkout.session.completed', sesionAltaPagada({ amount_total: 100 })));

      expect(r).toBe('RECHAZADO');
      expect(stores.crearPagada).not.toHaveBeenCalled();
      expect(consultasDs().some((c: { sql: string }) => /UPDATE alta_tienda SET estado = 'FALLIDA'/.test(c.sql))).toBe(true);
    });

    it('un pago sin alta registrada queda como huérfano y no crea ninguna tienda', async () => {
      bd.alta = null;

      const r = await service.procesarEvento(evento('checkout.session.completed', sesionAltaPagada()));

      expect(r).toBe('HUERFANO');
      expect(stores.crearPagada).not.toHaveBeenCalled();
    });

    it('un alta ya activada no se repite (otro evento del mismo pago)', async () => {
      bd.alta = altaPendiente({ estado: 'ACTIVADA' });

      expect(await service.procesarEvento(evento('checkout.session.completed', sesionAltaPagada()))).toBe('DUPLICADO');
      expect(stores.crearPagada).not.toHaveBeenCalled();
    });

    it('dos eventos a la vez: el que pierde la carrera revierte su tienda y responde DUPLICADO', async () => {
      bd.marcada = false; // another event already marked the purchase

      const r = await service.procesarEvento(evento('checkout.session.async_payment_succeeded', sesionAltaPagada(), 'evt_2'));

      expect(r).toBe('DUPLICADO');
      expect(consultasQr().some((c: { sql: string }) => /INSERT INTO suscripcion \(/.test(c.sql))).toBe(false);
    });

    it('un evento repetido por id no repite el efecto', async () => {
      bd.eventoNuevo = false;

      expect(await service.procesarEvento(evento('checkout.session.completed', sesionAltaPagada()))).toBe('DUPLICADO');
      expect(consultasQr().some((c: { sql: string }) => /INSERT INTO suscripcion \(/.test(c.sql))).toBe(false);
    });

    it('si la creación falla relanza el error para que Stripe reintente', async () => {
      stores.crearPagada.mockRejectedValue(new Error('db caída'));

      await expect(service.procesarEvento(evento('checkout.session.completed', sesionAltaPagada()))).rejects.toThrow('db caída');
    });

    it('una sesión que expira cierra el alta sin crear tienda, y un evento tardío no deshace una tienda activada', async () => {
      const r = await service.procesarEvento(evento('checkout.session.expired', { id: SESION_ALTA, metadata: { tipo: 'ALTA_TIENDA' } }));

      expect(r).toBe('PROCESADO');
      const cierre = consultasDs().find((c: { sql: string }) => /UPDATE alta_tienda SET estado = \$2/.test(c.sql));
      expect(cierre.sql).toMatch(/AND estado = 'PENDIENTE_PAGO'/);
      expect(cierre.params).toEqual([SESION_ALTA, 'EXPIRADA']);
      expect(stores.crearPagada).not.toHaveBeenCalled();
    });
  });

  describe('obtenerEstado', () => {
    it('una compra de alta solo la ve quien la hizo, y una activada se muestra como ACTIVA con su tienda', async () => {
      bd.alta = altaPendiente({ estado: 'ACTIVADA' });
      dataSource.query.mockImplementationOnce(async () => [
        { ...bd.alta, tienda_id: NUEVA_TIENDA, slug: 'moda-luna', tienda_nombre: 'Moda Luna' },
      ]);

      const r = await service.obtenerEstado(SESION_ALTA, USER);

      expect(r).toMatchObject({ tipo: 'ALTA_TIENDA', estado: 'ACTIVA', tienda: { id: NUEVA_TIENDA, slug: 'moda-luna' } });
      expect(consultasDs()[0].params).toEqual([SESION_ALTA, USER]);
    });
  });

  describe('renovación y cobros', () => {
    it('una renovación extiende el vencimiento hasta el fin del período facturado y limpia el cobro fallido', async () => {
      const r = await service.procesarEvento(evento('invoice.paid', factura()));

      expect(r).toBe('PROCESADO');
      const upd = consultasQr().find((c: { sql: string }) => /SET vence_en = GREATEST/.test(c.sql));
      expect(upd.sql).toMatch(/ultimo_cobro_fallido_en = NULL/);
      expect(upd.params).toEqual(['sus-1', 1900000000]);
    });

    it('la primera factura de una suscripción no se procesa aquí: ya la activó su checkout', async () => {
      expect(await service.procesarEvento(evento('invoice.paid', factura({ billing_reason: 'subscription_create' })))).toBe('IGNORADO');
      expect(qr.startTransaction).not.toHaveBeenCalled();
    });

    it('una renovación con otro monto se rechaza y no extiende nada', async () => {
      const r = await service.procesarEvento(evento('invoice.paid', factura({ amount_paid: 1 })));

      expect(r).toBe('RECHAZADO');
      expect(consultasQr().some((c: { sql: string }) => /SET vence_en = GREATEST/.test(c.sql))).toBe(false);
    });

    it('una factura de una suscripción desconocida es huérfana', async () => {
      bd.tiendaDeSub = null;

      expect(await service.procesarEvento(evento('invoice.paid', factura()))).toBe('HUERFANO');
    });

    it('lee la suscripción también en el formato anterior de la API (invoice.subscription)', async () => {
      const r = await service.procesarEvento(evento('invoice.paid', factura({ parent: undefined, subscription: SUB })));

      expect(r).toBe('PROCESADO');
    });

    it('un cobro fallido deja la marca para avisar al administrador', async () => {
      const r = await service.procesarEvento(evento('invoice.payment_failed', factura()));

      expect(r).toBe('PROCESADO');
      expect(consultasQr().some((c: { sql: string }) => /SET ultimo_cobro_fallido_en = now\(\)/.test(c.sql))).toBe(true);
    });

    it('un evento repetido de renovación no extiende dos veces', async () => {
      bd.eventoNuevo = false;

      expect(await service.procesarEvento(evento('invoice.paid', factura()))).toBe('DUPLICADO');
      expect(consultasQr().some((c: { sql: string }) => /SET vence_en = GREATEST/.test(c.sql))).toBe(false);
    });
  });

  describe('cancelación', () => {
    it('customer.subscription.updated sincroniza la marca de cancelar al vencer', async () => {
      await service.procesarEvento(evento('customer.subscription.updated', { id: SUB, cancel_at_period_end: true }));

      const upd = consultasQr().find((c: { sql: string }) => /SET cancelar_al_vencer = \$2/.test(c.sql));
      expect(upd.params).toEqual([SUB, true]);
    });

    it('customer.subscription.deleted termina la suscripción y recorta el vencimiento a ahora', async () => {
      const r = await service.procesarEvento(evento('customer.subscription.deleted', { id: SUB }));

      expect(r).toBe('PROCESADO');
      const upd = consultasQr().find((c: { sql: string }) => /SET estado = 'CANCELADA'/.test(c.sql));
      expect(upd.sql).toMatch(/LEAST\(vence_en, now\(\)\)/);
    });

    it('cancelar pide a Stripe cancelar al fin del período y marca la suscripción', async () => {
      await service.cancelarSuscripcion(TENANT, USER);

      expect(stripeFalso.subscriptions.update).toHaveBeenCalledWith(SUB, { cancel_at_period_end: true });
      const marca = consultasDs().find((c: { sql: string }) => /SET cancelar_al_vencer = \$2/.test(c.sql));
      expect(marca.params).toEqual(['sus-1', true]);
    });

    it('reanudar una renovación que no estaba cancelada se rechaza', async () => {
      await expect(service.reanudarSuscripcion(TENANT, USER)).rejects.toThrow(ConflictException);
      expect(stripeFalso.subscriptions.update).not.toHaveBeenCalled();
    });

    it('sin suscripción con renovación automática no hay nada que cancelar', async () => {
      dataSource.query.mockImplementation(async (sql: string) => (/SELECT id, stripe_subscription_id/.test(sql) ? [] : []));

      await expect(service.cancelarSuscripcion(TENANT, USER)).rejects.toThrow(/no tiene una suscripción/i);
    });

    it('cancelar exige ser propietario o administrador', async () => {
      planLimits.verificarAdministradorDeTienda.mockRejectedValue(new ForbiddenException('no'));

      await expect(service.cancelarSuscripcion(TENANT, USER)).rejects.toThrow(ForbiddenException);
      expect(stripeFalso.subscriptions.update).not.toHaveBeenCalled();
    });
  });

  describe('subir de plan retira la suscripción anterior', () => {
    const sesionPlan = {
      id: 'cs_plan',
      payment_status: 'paid',
      amount_total: PLANES_CONFIG.CORPORATIVO.precioMensual * 100,
      currency: 'usd',
      subscription: 'sub_nueva',
      customer: 'cus_123',
      metadata: { tipo: 'PLAN', tenantId: TENANT, plan: 'CORPORATIVO', periodo: 'MENSUAL', suscripcionId: 'sus-2' },
    };

    beforeEach(() => {
      qr.query.mockImplementation(async (sql: string) => {
        if (/INSERT INTO evento_webhook/.test(sql)) return [{ stripe_event_id: 'evt_1' }];
        if (/stripe_subscription_id IS NOT NULL AND stripe_session_id <>/.test(sql)) return bd.anteriores;
        if (/FROM suscripcion/.test(sql) && /FOR UPDATE/.test(sql)) {
          return [{ id: 'sus-2', tenant_id: TENANT, plan: 'CORPORATIVO', periodo: 'MENSUAL', estado: 'PENDIENTE_PAGO', monto: String(PLANES_CONFIG.CORPORATIVO.precioMensual), moneda: 'usd' }];
        }
        return [];
      });
    });

    it('cancela en Stripe la suscripción anterior y la marca CANCELADA en la misma transacción', async () => {
      bd.anteriores = [{ id: 'sus-vieja', stripe_subscription_id: 'sub_vieja' }];

      const r = await service.procesarEvento(evento('checkout.session.completed', sesionPlan));

      expect(r).toBe('PROCESADO');
      expect(stripeFalso.subscriptions.cancel).toHaveBeenCalledWith('sub_vieja');
      expect(consultasQr().some((c: { sql: string }) => /SET estado = 'CANCELADA'/.test(c.sql))).toBe(true);
      expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('si Stripe no puede cancelar la anterior se revierte todo y el error sube para que Stripe reintente el evento', async () => {
      bd.anteriores = [{ id: 'sus-vieja', stripe_subscription_id: 'sub_vieja' }];
      stripeFalso.subscriptions.cancel.mockRejectedValue(Object.assign(new Error('boom'), { code: 'api_error' }));

      await expect(service.procesarEvento(evento('checkout.session.completed', sesionPlan))).rejects.toThrow('boom');

      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.commitTransaction).not.toHaveBeenCalled();
      expect(consultasQr().some((c: { sql: string }) => /SET estado = 'CANCELADA'/.test(c.sql))).toBe(false);
    });

    it('una suscripción anterior que Stripe ya no tiene (resource_missing) no impide activar la nueva', async () => {
      bd.anteriores = [{ id: 'sus-vieja', stripe_subscription_id: 'sub_vieja' }];
      stripeFalso.subscriptions.cancel.mockRejectedValue(Object.assign(new Error('no such subscription'), { code: 'resource_missing' }));

      const r = await service.procesarEvento(evento('checkout.session.completed', sesionPlan));

      expect(r).toBe('PROCESADO');
      expect(consultasQr().some((c: { sql: string }) => /SET estado = 'CANCELADA'/.test(c.sql))).toBe(true);
    });
  });
});
