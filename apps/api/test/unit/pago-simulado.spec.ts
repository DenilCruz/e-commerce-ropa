jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { HttpException } from '@nestjs/common';
import { BillingService } from '../../src/modules/facturacion/billing.service';
import { PLANES_CONFIG } from '../../src/modules/tiendas/plan-limits.service';
import { evaluarPagoSimulado, expiracionVigente, numeroDeTarjetaValido } from '../../src/modules/facturacion/pago-simulado';

const AHORA = new Date('2026-11-08T12:00:00Z');
const tarjeta = (extra: Record<string, string> = {}) => ({
  metodo: 'TARJETA' as const,
  numero: '4242 4242 4242 4242',
  expiracion: '12/30',
  cvc: '123',
  titular: 'Ana Pérez',
  ...extra,
});
const motivoDeRechazo = (pago: Parameters<typeof evaluarPagoSimulado>[0]) => {
  try {
    evaluarPagoSimulado(pago, AHORA);
  } catch (e: any) {
    expect(e).toBeInstanceOf(HttpException);
    expect(e.getStatus()).toBe(402);
    return e.message as string;
  }
  return null;
};

describe('pasarela simulada: validación del pago', () => {
  it('numeroDeTarjetaValido aplica el algoritmo de Luhn', () => {
    expect(numeroDeTarjetaValido('4242 4242 4242 4242')).toBe(true);
    expect(numeroDeTarjetaValido('4242424242424241')).toBe(false);
    expect(numeroDeTarjetaValido('1234')).toBe(false);
    expect(numeroDeTarjetaValido('abcd efgh ijkl mnop')).toBe(false);
  });

  it('expiracionVigente acepta MM/AA y MM/AAAA hasta fin de mes y rechaza fechas pasadas o mal formadas', () => {
    expect(expiracionVigente('11/26', AHORA)).toBe(true); // this month still counts
    expect(expiracionVigente('10/26', AHORA)).toBe(false);
    expect(expiracionVigente('12/2030', AHORA)).toBe(true);
    expect(expiracionVigente('13/30', AHORA)).toBe(false);
    expect(expiracionVigente('1230', AHORA)).toBe(false);
  });

  it('una tarjeta válida y vigente se aprueba', () => {
    expect(motivoDeRechazo(tarjeta())).toBeNull();
  });

  it('el QR se aprueba al confirmar la transferencia', () => {
    expect(motivoDeRechazo({ metodo: 'QR' })).toBeNull();
  });

  it.each([
    ['número inválido', { numero: '4242 4242 4242 4241' }, /número de tarjeta/],
    ['vencida', { expiracion: '01/25' }, /fecha de vencimiento/],
    ['cvc corto', { cvc: '12' }, /código de seguridad/],
    ['sin titular', { titular: ' ' }, /titular/],
  ])('rechaza con 402 una tarjeta con %s', (_nombre, extra, patron) => {
    expect(motivoDeRechazo(tarjeta(extra as Record<string, string>))).toMatch(patron as RegExp);
  });

  it.each([
    ['4000 0000 0000 0002', /rechazada/],
    ['4000 0000 0000 9995', /Fondos insuficientes/],
    ['4000 0000 0000 0069', /vencida/],
  ])('las tarjetas de prueba %s dan el rechazo documentado', (numero, patron) => {
    expect(motivoDeRechazo(tarjeta({ numero }))).toMatch(patron as RegExp);
  });
});

describe('BillingService con la pasarela simulada (modo por defecto)', () => {
  const TENANT = 'a0a0a0a0-0000-4000-8000-000000000001';
  const NUEVA = 'b1b1b1b1-0000-4000-8000-000000000002';
  const USER = 'user-1';
  let service: BillingService;
  let qr: any;
  let dataSource: any;
  let stores: any;
  let planLimits: any;
  let stripeFalso: any;
  let alta: any;
  let sus: any;

  beforeEach(() => {
    alta = null;
    sus = null;
    qr = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn(async (sql: string) => {
        if (/UPDATE alta_tienda/.test(sql)) return [{ id: 'alta-1' }];
        if (/INSERT INTO evento_webhook/.test(sql)) return [{ stripe_event_id: 'x' }];
        if (/FROM suscripcion WHERE stripe_subscription_id/.test(sql)) return [{ id: 'sus-1', monto: '20', moneda: 'usd' }];
        if (/FROM suscripcion/.test(sql) && /FOR UPDATE/.test(sql)) {
          return sus ? [{ ...sus, estado: 'PENDIENTE_PAGO' }] : [];
        }
        return [];
      }),
    };
    dataSource = {
      createQueryRunner: jest.fn(() => qr),
      query: jest.fn(async (sql: string) => {
        if (/FROM usuario/.test(sql)) return [{ correo: 'ana@correo.com', email_verificado: true }];
        if (/count\(\*\)::int AS pendientes/.test(sql)) return [{ pendientes: 0 }];
        if (/FROM alta_tienda a LEFT JOIN/.test(sql)) return alta ? [{ ...alta, estado: 'ACTIVADA', tienda_id: NUEVA, slug: 'moda-luna', tienda_nombre: 'Moda Luna', nombre_solicitado: 'Moda Luna' }] : [];
        if (/SELECT \* FROM alta_tienda/.test(sql)) return alta ? [alta] : [];
        if (/FROM suscripcion\s+WHERE stripe_session_id/.test(sql) || /FROM suscripcion WHERE stripe_session_id/.test(sql)) return sus ? [sus] : [];
        if (/FROM suscripcion_stripe/.test(sql)) return [{ tienda_id: TENANT }];
        if (/stripe_subscription_id LIKE/.test(sql)) return [{ stripe_subscription_id: 'sim_sub_1', monto: '20', moneda: 'usd', periodo: 'MENSUAL', vence_en: '2026-12-08T00:00:00Z' }];
        if (/SELECT id, stripe_subscription_id, cancelar_al_vencer/.test(sql)) return [{ id: 'sus-1', stripe_subscription_id: 'sim_sub_1', cancelar_al_vencer: false }];
        return [];
      }),
    };
    planLimits = { verificarAdministradorDeTienda: jest.fn().mockResolvedValue({ id: TENANT }), obtenerPlanEfectivo: jest.fn().mockResolvedValue('FREE_TRIAL') };
    stores = {
      crearPagada: jest.fn(async (_u: string, _n: string, _p: string, dentro: (qr: any, t: any) => Promise<void>) => {
        await dentro(qr, { id: NUEVA });
        return { id: NUEVA };
      }),
    };
    const config = { get: jest.fn((k: string) => ({ STRIPE_SECRET_KEY: 'sk_test_dummy', APP_URL: 'http://localhost:5173' })[k]) };
    service = new BillingService(dataSource, config as any, planLimits, stores);
    stripeFalso = { checkout: { sessions: { create: jest.fn() } }, subscriptions: { update: jest.fn(), cancel: jest.fn() } };
    (service as any).stripe = Object.assign((service as any).stripe, stripeFalso);
  });

  it('el modo por defecto es simulado y no llama a Stripe al abrir la compra', async () => {
    expect(service.simulado).toBe(true);

    const r = await service.crearAltaTienda(USER, 'Moda Luna', 'ESTANDAR', 'MENSUAL');

    expect(stripeFalso.checkout.sessions.create).not.toHaveBeenCalled();
    expect(r.simulado).toBe(true);
    expect(r.sesionId).toMatch(/^sim_cs_/);
    expect(r.url).toBe(`http://localhost:5173/planes/pago-simulado?session_id=${r.sesionId}`);
    const insert = dataSource.query.mock.calls.find(([sql]: [string]) => /INSERT INTO alta_tienda/.test(sql));
    expect(insert[1]).toEqual(expect.arrayContaining([USER, 'Moda Luna', 'ESTANDAR', r.sesionId]));
  });

  it('un pago aprobado crea la tienda por la misma confirmación del webhook', async () => {
    alta = { id: 'alta-1', usuario_id: USER, nombre: 'Moda Luna', plan: 'ESTANDAR', periodo: 'MENSUAL', monto: String(PLANES_CONFIG.ESTANDAR.precioMensual), moneda: 'usd', estado: 'PENDIENTE_PAGO' };

    const r = await service.confirmarPagoSimulado(USER, 'sim_cs_abc', tarjeta() as any);

    expect(stores.crearPagada).toHaveBeenCalledWith(USER, 'Moda Luna', 'ESTANDAR', expect.any(Function));
    const insert = qr.query.mock.calls.find(([sql]: [string]) => /INSERT INTO suscripcion \(/.test(sql));
    expect(insert[1]).toEqual(expect.arrayContaining([NUEVA, 'ESTANDAR', 'MENSUAL', 'sim_cs_abc']));
    expect(insert[1].some((v: unknown) => typeof v === 'string' && v.startsWith('sim_sub_'))).toBe(true);
    expect(r).toMatchObject({ tipo: 'ALTA_TIENDA', estado: 'ACTIVA', tienda: { id: NUEVA, slug: 'moda-luna' } });
  });

  it('un pago rechazado no crea nada', async () => {
    alta = { id: 'alta-1', usuario_id: USER, nombre: 'Moda Luna', plan: 'ESTANDAR', periodo: 'MENSUAL', monto: '20', moneda: 'usd', estado: 'PENDIENTE_PAGO' };

    await expect(service.confirmarPagoSimulado(USER, 'sim_cs_abc', tarjeta({ numero: '4000 0000 0000 0002' }) as any)).rejects.toMatchObject({ status: 402 });

    expect(stores.crearPagada).not.toHaveBeenCalled();
  });

  it('pagar dos veces la misma compra no crea una segunda tienda', async () => {
    alta = { id: 'alta-1', usuario_id: USER, nombre: 'Moda Luna', plan: 'ESTANDAR', periodo: 'MENSUAL', monto: '20', moneda: 'usd', estado: 'ACTIVADA' };

    const r = await service.confirmarPagoSimulado(USER, 'sim_cs_abc', tarjeta() as any);

    expect(stores.crearPagada).not.toHaveBeenCalled();
    expect(r.estado).toBe('ACTIVA');
  });

  it('una sesión que no es simulada se rechaza, y la de otro usuario no existe', async () => {
    await expect(service.confirmarPagoSimulado(USER, 'cs_test_real', tarjeta() as any)).rejects.toThrow(/simulada/);
    await expect(service.confirmarPagoSimulado('otro-usuario', 'sim_cs_abc', tarjeta() as any)).rejects.toThrow(/No existe una compra/);
    expect(stores.crearPagada).not.toHaveBeenCalled();
  });

  it('el pago de un plan para una tienda existente exige ser su administrador y la activa', async () => {
    sus = { id: 'sus-2', tenant_id: TENANT, plan: 'CORPORATIVO', periodo: 'MENSUAL', estado: 'PENDIENTE_PAGO', monto: String(PLANES_CONFIG.CORPORATIVO.precioMensual), moneda: 'usd' };

    await service.confirmarPagoSimulado(USER, 'sim_cs_plan', { metodo: 'QR' });

    expect(planLimits.verificarAdministradorDeTienda).toHaveBeenCalledWith(TENANT, USER);
    expect(qr.query.mock.calls.some(([sql]: [string]) => /UPDATE tienda SET plan/.test(sql))).toBe(true);
    expect(stores.crearPagada).not.toHaveBeenCalled();
  });

  describe('modo de pago sin configurar', () => {
    const crear = (valores: Record<string, string>) =>
      new BillingService(dataSource, { get: jest.fn((k: string) => valores[k]) } as any, planLimits, stores);
    const entorno = process.env.NODE_ENV;
    const modo = process.env.PLAN_PAYMENT_MODE;
    afterEach(() => {
      if (entorno === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = entorno;
      if (modo === undefined) delete process.env.PLAN_PAYMENT_MODE;
      else process.env.PLAN_PAYMENT_MODE = modo;
    });

    it('en producción sin PLAN_PAYMENT_MODE los pagos quedan cerrados: nadie obtiene un plan gratis', async () => {
      delete process.env.PLAN_PAYMENT_MODE;
      const cerrado = crear({ NODE_ENV: 'production', STRIPE_SECRET_KEY: 'sk_test_dummy' });

      expect(cerrado.simulado).toBe(false);
      await expect(cerrado.crearAltaTienda(USER, 'Moda Luna', 'ESTANDAR', 'MENSUAL')).rejects.toMatchObject({ status: 503 });
      await expect(cerrado.crearCheckout(TENANT, USER, 'ESTANDAR', 'MENSUAL')).rejects.toMatchObject({ status: 503 });
      await expect(cerrado.confirmarPagoSimulado(USER, 'sim_cs_abc', { metodo: 'QR' })).rejects.toThrow(/desactivada/);
      expect(stripeFalso.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('en producción solo se simula si PLAN_PAYMENT_MODE=simulado está escrito a propósito', () => {
      expect(crear({ NODE_ENV: 'production', PLAN_PAYMENT_MODE: 'simulado', STRIPE_SECRET_KEY: 'sk_test_dummy' }).simulado).toBe(true);
    });

    it('en desarrollo sin configurar se simula, y con stripe no', () => {
      delete process.env.PLAN_PAYMENT_MODE;
      expect(crear({ NODE_ENV: 'development', STRIPE_SECRET_KEY: 'sk_test_dummy' }).simulado).toBe(true);
      expect(crear({ NODE_ENV: 'production', PLAN_PAYMENT_MODE: 'stripe', STRIPE_SECRET_KEY: 'sk_test_dummy' }).simulado).toBe(false);
    });
  });

  it('con PLAN_PAYMENT_MODE=stripe la pasarela simulada responde 404', async () => {
    const config = { get: jest.fn((k: string) => ({ PLAN_PAYMENT_MODE: 'stripe', STRIPE_SECRET_KEY: 'sk_test_dummy' })[k]) };
    const real = new BillingService(dataSource, config as any, planLimits, stores);

    expect(real.simulado).toBe(false);
    await expect(real.confirmarPagoSimulado(USER, 'sim_cs_abc', { metodo: 'QR' })).rejects.toThrow(/desactivada/);
  });

  it('simular el cobro del período extiende el vencimiento un mes y no llama a Stripe', async () => {
    await service.simularCobroDelPeriodo(TENANT, USER, 'EXITOSO');

    const upd = qr.query.mock.calls.find(([sql]: [string]) => /SET vence_en = GREATEST/.test(sql));
    expect(upd[1][1]).toBe(Math.floor(new Date('2027-01-08T00:00:00Z').getTime() / 1000));
    expect(stripeFalso.subscriptions.update).not.toHaveBeenCalled();
  });

  it('simular un cobro fallido deja la marca de aviso', async () => {
    await service.simularCobroDelPeriodo(TENANT, USER, 'FALLIDO');

    expect(qr.query.mock.calls.some(([sql]: [string]) => /SET ultimo_cobro_fallido_en = now\(\)/.test(sql))).toBe(true);
  });

  it('cancelar la renovación de una suscripción simulada no llama a Stripe', async () => {
    await service.cancelarSuscripcion(TENANT, USER);

    expect(stripeFalso.subscriptions.update).not.toHaveBeenCalled();
    expect(dataSource.query.mock.calls.some(([sql]: [string]) => /SET cancelar_al_vencer = \$2/.test(sql))).toBe(true);
  });
});
