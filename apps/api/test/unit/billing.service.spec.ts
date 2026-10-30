jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BillingService } from '../../src/modules/facturacion/billing.service';
import { PLANES_CONFIG } from '../../src/modules/tiendas/plan-limits.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

const StripeLib = require('stripe');

const TENANT = 'a0a0a0a0-0000-4000-8000-000000000001';
const USER = 'user-1';
const SECRETO = 'whsec_test_secreto_de_prueba';
const SESION = 'cs_test_123';

const suscripcionPendiente = (extra: Record<string, unknown> = {}) => ({
  id: 'sus-1',
  tenant_id: TENANT,
  plan: 'ESTANDAR',
  periodo: 'MENSUAL',
  estado: 'PENDIENTE_PAGO',
  monto: String(PLANES_CONFIG.ESTANDAR.precioMensual),
  moneda: 'bob',
  ...extra,
});

const sesionPagada = (extra: Record<string, unknown> = {}) => ({
  id: SESION,
  payment_status: 'paid',
  amount_total: PLANES_CONFIG.ESTANDAR.precioMensual * 100,
  currency: 'bob',
  payment_intent: 'pi_123',
  metadata: { tipo: 'PLAN', tenantId: TENANT, plan: 'ESTANDAR', periodo: 'MENSUAL', suscripcionId: 'sus-1' },
  ...extra,
});

const evento = (tipo: string, objeto: unknown, id = 'evt_1') => ({ id, type: tipo, data: { object: objeto } }) as any;

describe('BillingService', () => {
  let service: BillingService;
  let qr: any;
  let dataSource: any;
  let planLimits: any;
  let stripeFalso: any;
  /** what the mocked database answers */
  let bd: { eventoNuevo: boolean; suscripcion: any | null };

  beforeEach(() => {
    bd = { eventoNuevo: true, suscripcion: suscripcionPendiente() };
    qr = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn(async (sql: string) => {
        if (/INSERT INTO evento_webhook/.test(sql)) return bd.eventoNuevo ? [{ stripe_event_id: 'evt_1' }] : [];
        if (/FROM suscripcion/.test(sql) && /FOR UPDATE/.test(sql)) return bd.suscripcion ? [bd.suscripcion] : [];
        return [];
      }),
    };
    dataSource = { createQueryRunner: jest.fn(() => qr), query: jest.fn().mockResolvedValue([{ correo: 'admin@aura.com' }]) };
    planLimits = { verificarAdministradorDeTienda: jest.fn().mockResolvedValue({ id: TENANT, nombre: 'AURA' }) };
    const config = { get: jest.fn((k: string) => ({ STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: SECRETO, APP_URL: 'http://localhost:5173' })[k]) };

    service = new BillingService(dataSource, config as any, planLimits);
    stripeFalso = { checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: SESION, url: 'https://checkout.stripe.com/c/pay/cs_test_123' }) } } };
    (service as any).stripe = Object.assign((service as any).stripe, stripeFalso);
  });

  const consultas = () => qr.query.mock.calls.map(([sql, params]: [string, unknown[]]) => ({ sql, params }));
  const hizo = (patron: RegExp) => consultas().some((c: { sql: string }) => patron.test(c.sql));

  describe('crearCheckout', () => {
    it('abre una sesión de Stripe por el monto exacto del plan y guarda la suscripción PENDIENTE_PAGO', async () => {
      const r = await service.crearCheckout(TENANT, USER, 'ESTANDAR', 'ANUAL');

      const args = stripeFalso.checkout.sessions.create.mock.calls[0][0];
      expect(args.mode).toBe('payment');
      expect(args.line_items[0].price_data.currency).toBe('bob');
      expect(args.line_items[0].price_data.unit_amount).toBe(PLANES_CONFIG.ESTANDAR.precioAnual * 12 * 100);
      expect(args.metadata).toMatchObject({ tipo: 'PLAN', tenantId: TENANT, plan: 'ESTANDAR', periodo: 'ANUAL' });
      expect(args.success_url).toContain('/planes/retorno?session_id={CHECKOUT_SESSION_ID}');
      expect(r.url).toContain('checkout.stripe.com');

      const insert = dataSource.query.mock.calls.find(([sql]: [string]) => /INSERT INTO suscripcion/.test(sql));
      expect(insert).toBeTruthy();
      expect(insert[1]).toEqual(expect.arrayContaining([TENANT, 'ESTANDAR', 'ANUAL', SESION]));
    });

    it('no cambia el plan: solo el webhook lo hace', async () => {
      await service.crearCheckout(TENANT, USER, 'CORPORATIVO', 'MENSUAL');

      expect(dataSource.query.mock.calls.some(([sql]: [string]) => /UPDATE tienda/.test(sql))).toBe(false);
    });

    it('rechaza un plan que no se vende', async () => {
      await expect(service.crearCheckout(TENANT, USER, 'FREE_TRIAL', 'MENSUAL')).rejects.toThrow(BadRequestException);
      expect(stripeFalso.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('exige ser propietario o administrador de la tienda', async () => {
      planLimits.verificarAdministradorDeTienda.mockRejectedValue(new ForbiddenException('no'));

      await expect(service.crearCheckout(TENANT, USER, 'ESTANDAR', 'MENSUAL')).rejects.toThrow(ForbiddenException);
      expect(stripeFalso.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });

  describe('verificarFirma', () => {
    const stripe = new StripeLib('sk_test_dummy');
    const cuerpo = Buffer.from(JSON.stringify(evento('checkout.session.completed', sesionPagada())));
    const firmar = (payload: Buffer, secreto = SECRETO) => stripe.webhooks.generateTestHeaderString({ payload: payload.toString(), secret: secreto });

    it('acepta un evento firmado con el secreto del webhook', () => {
      const e = service.verificarFirma(cuerpo, firmar(cuerpo));

      expect(e.type).toBe('checkout.session.completed');
    });

    it('rechaza (400) una firma de otro secreto, un cuerpo alterado o la falta de firma', () => {
      expect(() => service.verificarFirma(cuerpo, firmar(cuerpo, 'whsec_otro'))).toThrow(BadRequestException);
      expect(() => service.verificarFirma(Buffer.from('{"id":"evt_x"}'), firmar(cuerpo))).toThrow(BadRequestException);
      expect(() => service.verificarFirma(cuerpo, undefined)).toThrow(BadRequestException);
      expect(() => service.verificarFirma(undefined, firmar(cuerpo))).toThrow(BadRequestException);
    });
  });

  describe('procesarEvento: pago confirmado de un plan', () => {
    it('activa la suscripción y el plan de la tienda en una sola transacción', async () => {
      const r = await service.procesarEvento(evento('checkout.session.completed', sesionPagada()));

      expect(r).toBe('PROCESADO');
      expect(qr.startTransaction).toHaveBeenCalledTimes(1);
      expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
      expect(qr.rollbackTransaction).not.toHaveBeenCalled();
      expect(hizo(/UPDATE suscripcion[\s\S]*ACTIVA/)).toBe(true);
      const tienda = consultas().find((c: { sql: string }) => /UPDATE tienda/.test(c.sql));
      expect(tienda.params).toEqual([TENANT, 'ESTANDAR']);
    });

    it('un evento repetido no hace nada (idempotencia por id de evento)', async () => {
      bd.eventoNuevo = false;

      const r = await service.procesarEvento(evento('checkout.session.completed', sesionPagada()));

      expect(r).toBe('DUPLICADO');
      expect(hizo(/UPDATE tienda/)).toBe(false);
      expect(hizo(/FOR UPDATE/)).toBe(false);
    });

    it('otro evento del mismo pago sobre una suscripción ya activa tampoco repite el efecto', async () => {
      bd.suscripcion = suscripcionPendiente({ estado: 'ACTIVA' });

      const r = await service.procesarEvento(evento('checkout.session.async_payment_succeeded', sesionPagada(), 'evt_2'));

      expect(r).toBe('DUPLICADO');
      expect(hizo(/UPDATE tienda/)).toBe(false);
    });

    it('rechaza un monto distinto al guardado y no concede el plan', async () => {
      const r = await service.procesarEvento(evento('checkout.session.completed', sesionPagada({ amount_total: 100 })));

      expect(r).toBe('RECHAZADO');
      expect(hizo(/UPDATE tienda/)).toBe(false);
      expect(hizo(/estado = 'FALLIDA'|'FALLIDA'/)).toBe(true);
    });

    it('rechaza una moneda distinta a la guardada', async () => {
      const r = await service.procesarEvento(evento('checkout.session.completed', sesionPagada({ currency: 'usd' })));

      expect(r).toBe('RECHAZADO');
      expect(hizo(/UPDATE tienda/)).toBe(false);
    });

    it('un pago de una suscripción que no existe queda registrado como huérfano y no toca ninguna tienda', async () => {
      bd.suscripcion = null;

      const r = await service.procesarEvento(evento('checkout.session.completed', sesionPagada()));

      expect(r).toBe('HUERFANO');
      expect(hizo(/UPDATE tienda/)).toBe(false);
    });

    it('ignora un pago que todavía no está cobrado (llegará otro evento)', async () => {
      const r = await service.procesarEvento(evento('checkout.session.completed', sesionPagada({ payment_status: 'unpaid' })));

      expect(r).toBe('PENDIENTE');
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('si la base falla revierte todo y relanza, para que Stripe reintente', async () => {
      qr.query.mockImplementation(async (sql: string) => {
        if (/INSERT INTO evento_webhook/.test(sql)) return [{ stripe_event_id: 'evt_1' }];
        if (/FOR UPDATE/.test(sql)) return [suscripcionPendiente()];
        if (/UPDATE tienda/.test(sql)) throw new Error('se cayó la base');
        return [];
      });

      await expect(service.procesarEvento(evento('checkout.session.completed', sesionPagada()))).rejects.toThrow('se cayó la base');
      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.commitTransaction).not.toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });

    it('trabaja bajo el contexto de la tienda del pago (el webhook no trae sesión ni tienda propia)', async () => {
      const vistas: Array<string | undefined> = [];
      qr.query.mockImplementation(async (sql: string) => {
        vistas.push(TenantContext.get());
        if (/INSERT INTO evento_webhook/.test(sql)) return [{ stripe_event_id: 'evt_1' }];
        if (/FOR UPDATE/.test(sql)) return [suscripcionPendiente()];
        return [];
      });

      await TenantContext.runAs('otra-tienda-de-la-solicitud', undefined, () =>
        service.procesarEvento(evento('checkout.session.completed', sesionPagada())),
      );

      expect(vistas.length).toBeGreaterThan(0);
      expect(new Set(vistas)).toEqual(new Set([TENANT]));
    });
  });

  describe('procesarEvento: otros eventos', () => {
    it('una sesión que expira deja la suscripción en EXPIRADA', async () => {
      const r = await service.procesarEvento(evento('checkout.session.expired', sesionPagada({ payment_status: 'unpaid' })));

      expect(r).toBe('PROCESADO');
      const update = consultas().find((c: { sql: string }) => /UPDATE suscripcion/.test(c.sql));
      expect(update.params).toEqual(expect.arrayContaining([SESION, 'EXPIRADA']));
    });

    it('ignora eventos que no conoce y sesiones que no son de planes', async () => {
      expect(await service.procesarEvento(evento('customer.created', {}))).toBe('IGNORADO');
      expect(await service.procesarEvento(evento('checkout.session.completed', sesionPagada({ metadata: { tipo: 'PEDIDO' } })))).toBe('IGNORADO');
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });
  });
});
