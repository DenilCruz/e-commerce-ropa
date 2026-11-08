import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PLANES_CONFIG, PeriodoPlan, PlanLimitsService, TipoPlan, calcularMontoPlan } from '../tiendas/plan-limits.service';
import { StoresService } from '../tiendas/stores.service';
import { PagoSimulado, evaluarPagoSimulado } from './pago-simulado';

const StripeClient = require('stripe');

/** What happened with a webhook event. Everything but a thrown error is answered with 200 so Stripe stops retrying. */
export type ResultadoEvento = 'PROCESADO' | 'DUPLICADO' | 'PENDIENTE' | 'RECHAZADO' | 'HUERFANO' | 'IGNORADO';

/** Thrown inside the store-provisioning transaction to roll it back when another event already did the work. */
class AltaYaProcesada extends Error {}

const MAX_ALTAS_PENDIENTES_POR_HORA = 5;

/** Subscriptions and sessions of the simulated gateway carry this prefix; Stripe is never called for them. */
const esSimulada = (id: string | null | undefined) => !!id && id.startsWith('sim_');

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly planLimits: PlanLimitsService,
    private readonly stores?: StoresService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || process.env.STRIPE_SECRET_KEY || '';
    // Tests and local demos can point the client at a Stripe look-alike; production leaves these unset
    const host = this.configService.get<string>('STRIPE_API_HOST') || process.env.STRIPE_API_HOST;
    const apuntaAOtroHost = host
      ? {
          host,
          port: this.configService.get<string>('STRIPE_API_PORT') || process.env.STRIPE_API_PORT || '443',
          protocol: this.configService.get<string>('STRIPE_API_PROTOCOL') || process.env.STRIPE_API_PROTOCOL || 'https',
        }
      : {};
    this.stripe = new StripeClient(secretKey, { apiVersion: '2026-08-26.dahlia', ...apuntaAOtroHost });
    if (this.simulado && (this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV) === 'production') {
      this.logger.warn('Pagos de planes SIMULADOS en producción (PLAN_PAYMENT_MODE=simulado): nadie paga de verdad.');
    }
  }

  /**
   * Plan payments run on a simulated gateway unless PLAN_PAYMENT_MODE=stripe. The simulation goes through the same
   * server-side confirmation as Stripe's webhook, so the store is only created once the (simulated) payment is approved.
   */
  get simulado(): boolean {
    return this.modoDePago === 'simulado';
  }

  /**
   * An explicit PLAN_PAYMENT_MODE wins. Left unset, a development machine simulates, but a production server stays
   * closed: a missing setting must never turn into free paid plans.
   */
  private get modoDePago(): 'simulado' | 'stripe' | 'cerrado' {
    const explicito = (this.configService.get<string>('PLAN_PAYMENT_MODE') || process.env.PLAN_PAYMENT_MODE || '').toLowerCase();
    if (explicito === 'stripe' || explicito === 'simulado') return explicito;
    const entorno = this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV;
    return entorno === 'production' ? 'cerrado' : 'simulado';
  }

  private async abrirSesionDePago(params: Stripe.Checkout.SessionCreateParams): Promise<{ id: string; url: string }> {
    if (this.modoDePago === 'cerrado') {
      throw new ServiceUnavailableException('Los pagos de planes no están configurados en este servidor (define PLAN_PAYMENT_MODE).');
    }
    if (!this.simulado) {
      const sesion = await this.stripe.checkout.sessions.create(params);
      return { id: sesion.id, url: sesion.url as string };
    }
    const id = `sim_cs_${randomUUID()}`;
    return { id, url: `${this.clientUrl}/planes/pago-simulado?session_id=${id}` };
  }

  private get clientUrl(): string {
    return this.configService.get<string>('APP_URL') || process.env.APP_URL || 'http://localhost:5173';
  }

  /** The recurring price Stripe will charge every period: monthly price, or the 12-month total once a year. */
  private lineaDeSuscripcion(planKey: TipoPlan, periodo: PeriodoPlan, monto: number) {
    const config = PLANES_CONFIG[planKey];
    return {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(monto * 100),
        recurring: { interval: periodo === 'ANUAL' ? ('year' as const) : ('month' as const) },
        product_data: { name: `${config.nombre} · ${periodo === 'ANUAL' ? 'anual' : 'mensual'}`, description: config.descripcion },
      },
    };
  }

  // =========================================================================
  // CHECKOUT de una tienda que ya existe: abre la suscripcion. El plan NO cambia aqui; lo cambia el webhook.
  // =========================================================================
  async crearCheckout(tenantId: string, usuarioId: string, plan: string, periodo: PeriodoPlan) {
    const planKey = plan?.toUpperCase() as TipoPlan;
    const monto = calcularMontoPlan(planKey, periodo); // 400 si el plan no se vende
    await this.planLimits.verificarAdministradorDeTienda(tenantId, usuarioId);

    // Buying a cheaper plan than the one already in force would charge again for less
    const planVigente = PLANES_CONFIG[await this.planLimits.obtenerPlanEfectivo(tenantId)];
    if (PLANES_CONFIG[planKey].precioMensual < planVigente.precioMensual) {
      throw new ConflictException(
        `Ya tienes el ${planVigente.nombre} vigente, que incluye todo lo del ${PLANES_CONFIG[planKey].nombre}. No hace falta comprarlo.`,
      );
    }

    // A second subscription to the same plan would charge twice
    const [mismaVigente] = await this.dataSource.query(
      `SELECT cancelar_al_vencer FROM suscripcion
        WHERE tenant_id = $1 AND plan = $2 AND estado = 'ACTIVA' AND stripe_subscription_id IS NOT NULL AND vence_en > now()
        LIMIT 1`,
      [tenantId, planKey],
    );
    if (mismaVigente) {
      throw new ConflictException(
        mismaVigente.cancelar_al_vencer
          ? `Tu ${PLANES_CONFIG[planKey].nombre} sigue vigente pero no se renovará. Reanuda la renovación en vez de comprarlo de nuevo.`
          : `Ya tienes el ${PLANES_CONFIG[planKey].nombre} activo con renovación automática.`,
      );
    }

    const [usuario] = await this.dataSource.query('SELECT correo FROM usuario WHERE id = $1', [usuarioId]);
    const suscripcionId = randomUUID();
    const metadata = { tipo: 'PLAN', tenantId, usuarioId, plan: planKey, periodo, suscripcionId };

    const sesion = await this.abrirSesionDePago({
      mode: 'subscription',
      customer_email: usuario?.correo,
      client_reference_id: suscripcionId,
      line_items: [this.lineaDeSuscripcion(planKey, periodo, monto)],
      metadata,
      subscription_data: { metadata },
      success_url: `${this.clientUrl}/planes/retorno?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.clientUrl}/planes?cancelado=1`,
    });

    await this.dataSource.query(
      `INSERT INTO suscripcion (id, tenant_id, usuario_id, plan, periodo, monto, moneda, stripe_session_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'usd', $7)`,
      [suscripcionId, tenantId, usuarioId, planKey, periodo, monto, sesion.id],
    );

    return { url: sesion.url, sesionId: sesion.id, suscripcionId, monto, moneda: 'usd', simulado: this.simulado };
  }

  // =========================================================================
  // ALTA DE TIENDA AL PAGAR: la tienda no existe hasta que el webhook confirma el pago
  // =========================================================================
  async crearAltaTienda(usuarioId: string, nombre: string, plan: string, periodo: PeriodoPlan) {
    const planKey = plan?.toUpperCase() as TipoPlan;
    const monto = calcularMontoPlan(planKey, periodo); // 400 si el plan no se vende
    const nombreLimpio = (nombre ?? '').trim();
    if (nombreLimpio.length < 3 || nombreLimpio.length > 100) {
      throw new BadRequestException('El nombre de la tienda debe tener entre 3 y 100 caracteres.');
    }

    const [usuario] = await this.dataSource.query('SELECT correo, email_verificado FROM usuario WHERE id = $1', [usuarioId]);
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    if (!usuario.email_verificado) {
      throw new ForbiddenException('Verifica tu correo electrónico antes de contratar un plan.');
    }

    const [{ pendientes }] = await this.dataSource.query(
      `SELECT count(*)::int AS pendientes FROM alta_tienda
        WHERE usuario_id = $1 AND estado = 'PENDIENTE_PAGO' AND creado_en > now() - interval '1 hour'`,
      [usuarioId],
    );
    if (pendientes >= MAX_ALTAS_PENDIENTES_POR_HORA) {
      throw new HttpException('Tienes demasiados pagos pendientes. Completa uno o espera una hora.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const altaId = randomUUID();
    const metadata = { tipo: 'ALTA_TIENDA', altaId, usuarioId, nombre: nombreLimpio, plan: planKey, periodo };

    const sesion = await this.abrirSesionDePago({
      mode: 'subscription',
      customer_email: usuario.correo,
      client_reference_id: altaId,
      line_items: [this.lineaDeSuscripcion(planKey, periodo, monto)],
      metadata,
      subscription_data: { metadata },
      success_url: `${this.clientUrl}/planes/retorno?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.clientUrl}/planes?cancelado=1`,
    });

    await this.dataSource.query(
      `INSERT INTO alta_tienda (id, usuario_id, nombre, plan, periodo, monto, moneda, stripe_session_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'usd', $7)`,
      [altaId, usuarioId, nombreLimpio, planKey, periodo, monto, sesion.id],
    );

    return { url: sesion.url, sesionId: sesion.id, altaId, monto, moneda: 'usd', simulado: this.simulado };
  }

  /**
   * Estado de una compra (la pantalla de retorno lo consulta hasta que el webhook la activa).
   * Una compra de alta de tienda es del usuario que la hizo; una compra de plan, de la tienda activa.
   */
  async obtenerEstado(sesionId: string, usuarioId?: string) {
    if (usuarioId) {
      const [alta] = await this.dataSource.query(
        `SELECT a.estado, a.plan, a.periodo, a.monto, a.moneda, a.nombre AS nombre_solicitado, a.tienda_id, t.slug, t.nombre AS tienda_nombre
           FROM alta_tienda a LEFT JOIN tienda t ON t.id = a.tienda_id
          WHERE a.stripe_session_id = $1 AND a.usuario_id = $2`,
        [sesionId, usuarioId],
      );
      if (alta) {
        return {
          tipo: 'ALTA_TIENDA' as const,
          estado: alta.estado === 'ACTIVADA' ? 'ACTIVA' : alta.estado,
          plan: alta.plan,
          periodo: alta.periodo,
          monto: Number(alta.monto),
          moneda: alta.moneda,
          venceEn: null,
          nombreTienda: alta.nombre_solicitado as string,
          tienda: alta.tienda_id ? { id: alta.tienda_id, slug: alta.slug, nombre: alta.tienda_nombre } : null,
        };
      }
    }
    const [fila] = await this.dataSource.query(
      'SELECT estado, plan, periodo, monto, moneda, vence_en FROM suscripcion WHERE stripe_session_id = $1',
      [sesionId],
    );
    if (!fila) throw new NotFoundException('No existe una compra de plan con esa sesión.');
    return {
      tipo: 'PLAN' as const,
      estado: fila.estado,
      plan: fila.plan,
      periodo: fila.periodo,
      monto: Number(fila.monto),
      moneda: fila.moneda,
      venceEn: fila.vence_en,
      nombreTienda: null as string | null,
      tienda: null,
    };
  }

  // =========================================================================
  // MI SUSCRIPCION: ver, cancelar al final del periodo y reanudar
  // =========================================================================
  async obtenerMiSuscripcion(tenantId: string, usuarioId: string) {
    await this.planLimits.verificarAdministradorDeTienda(tenantId, usuarioId);
    const [fila] = await this.dataSource.query(
      `SELECT plan, periodo, monto, moneda, vence_en, cancelar_al_vencer, ultimo_cobro_fallido_en
         FROM suscripcion
        WHERE tenant_id = $1 AND estado = 'ACTIVA' AND stripe_subscription_id IS NOT NULL AND vence_en > now()
        ORDER BY vence_en DESC LIMIT 1`,
      [tenantId],
    );
    if (!fila) return { suscripcion: null, simulado: this.simulado };
    return {
      simulado: this.simulado,
      suscripcion: {
        plan: fila.plan,
        periodo: fila.periodo,
        monto: Number(fila.monto),
        moneda: fila.moneda,
        venceEn: fila.vence_en,
        cancelarAlVencer: fila.cancelar_al_vencer,
        ultimoCobroFallidoEn: fila.ultimo_cobro_fallido_en,
      },
    };
  }

  /** Stops the renewal: the plan keeps working until the period already paid ends. */
  async cancelarSuscripcion(tenantId: string, usuarioId: string) {
    return this.cambiarRenovacion(tenantId, usuarioId, true);
  }

  /** Undoes a cancellation made earlier, while the paid period has not ended. */
  async reanudarSuscripcion(tenantId: string, usuarioId: string) {
    return this.cambiarRenovacion(tenantId, usuarioId, false);
  }

  private async cambiarRenovacion(tenantId: string, usuarioId: string, cancelar: boolean) {
    await this.planLimits.verificarAdministradorDeTienda(tenantId, usuarioId);
    const [actual] = await this.dataSource.query(
      `SELECT id, stripe_subscription_id, cancelar_al_vencer FROM suscripcion
        WHERE tenant_id = $1 AND estado = 'ACTIVA' AND stripe_subscription_id IS NOT NULL AND vence_en > now()
        ORDER BY vence_en DESC LIMIT 1`,
      [tenantId],
    );
    if (!actual) throw new ConflictException('Tu tienda no tiene una suscripción con renovación automática.');
    if (actual.cancelar_al_vencer === cancelar) {
      throw new ConflictException(cancelar ? 'La renovación ya estaba cancelada.' : 'La renovación ya estaba activa.');
    }

    if (!esSimulada(actual.stripe_subscription_id)) {
      await this.stripe.subscriptions.update(actual.stripe_subscription_id, { cancel_at_period_end: cancelar });
    }
    await this.dataSource.query('UPDATE suscripcion SET cancelar_al_vencer = $2, actualizado_en = now() WHERE id = $1', [actual.id, cancelar]);
    return this.obtenerMiSuscripcion(tenantId, usuarioId);
  }

  // =========================================================================
  // PASARELA SIMULADA: misma confirmacion que el webhook, sin dinero real
  // =========================================================================
  private exigirSimulacion() {
    if (!this.simulado) throw new NotFoundException('La pasarela simulada está desactivada: los planes se pagan en Stripe.');
  }

  /**
   * Approves a simulated payment and runs the very same confirmation Stripe's webhook would: the store (or the plan)
   * is created or activated inside one idempotent transaction. A declined payment creates nothing.
   */
  async confirmarPagoSimulado(usuarioId: string, sesionId: string, pago: PagoSimulado) {
    this.exigirSimulacion();
    if (!sesionId?.startsWith('sim_cs_')) throw new BadRequestException('La sesión no pertenece a la pasarela simulada.');

    const [alta] = await this.dataSource.query('SELECT * FROM alta_tienda WHERE stripe_session_id = $1 AND usuario_id = $2', [sesionId, usuarioId]);
    let metadata: Record<string, string>;
    let montoCentavos: number;
    let moneda: string;

    if (alta) {
      if (alta.estado === 'ACTIVADA') return this.obtenerEstado(sesionId, usuarioId);
      if (alta.estado !== 'PENDIENTE_PAGO') throw new ConflictException('Esta compra ya no está disponible. Empieza de nuevo desde los planes.');
      metadata = { tipo: 'ALTA_TIENDA', altaId: alta.id, usuarioId, nombre: alta.nombre, plan: alta.plan, periodo: alta.periodo };
      montoCentavos = Math.round(Number(alta.monto) * 100);
      moneda = alta.moneda;
    } else {
      // A plan for a store that already exists: the purchase belongs to the active store (row-level security)
      const [sus] = await this.dataSource.query(
        'SELECT id, tenant_id, plan, periodo, estado, monto, moneda FROM suscripcion WHERE stripe_session_id = $1',
        [sesionId],
      );
      if (!sus) throw new NotFoundException('No existe una compra con esa sesión.');
      await this.planLimits.verificarAdministradorDeTienda(sus.tenant_id, usuarioId);
      if (sus.estado === 'ACTIVA') return this.obtenerEstado(sesionId, usuarioId);
      if (sus.estado !== 'PENDIENTE_PAGO') throw new ConflictException('Esta compra ya no está disponible. Empieza de nuevo desde los planes.');
      metadata = { tipo: 'PLAN', tenantId: sus.tenant_id, usuarioId, plan: sus.plan, periodo: sus.periodo, suscripcionId: sus.id };
      montoCentavos = Math.round(Number(sus.monto) * 100);
      moneda = sus.moneda;
    }

    // The gateway's answer: a decline throws a 402 here and nothing below runs
    evaluarPagoSimulado(pago);

    const sesion = {
      id: sesionId,
      payment_status: 'paid',
      amount_total: montoCentavos,
      currency: moneda,
      subscription: `sim_sub_${randomUUID()}`,
      customer: `sim_cus_${usuarioId}`,
      metadata,
    };
    const resultado = await this.procesarEvento({ id: `sim_evt_${randomUUID()}`, type: 'checkout.session.completed', data: { object: sesion } } as unknown as Stripe.Event);
    if (resultado !== 'PROCESADO' && resultado !== 'DUPLICADO') {
      throw new ConflictException(`No se pudo completar el pago simulado (${resultado}).`);
    }
    return this.obtenerEstado(sesionId, usuarioId);
  }

  /** Demo helper: the next monthly (or yearly) charge of a simulated subscription goes through, or fails. */
  async simularCobroDelPeriodo(tenantId: string, usuarioId: string, resultado: 'EXITOSO' | 'FALLIDO') {
    this.exigirSimulacion();
    await this.planLimits.verificarAdministradorDeTienda(tenantId, usuarioId);
    const [sus] = await this.dataSource.query(
      `SELECT stripe_subscription_id, monto, moneda, periodo, vence_en FROM suscripcion
        WHERE tenant_id = $1 AND estado = 'ACTIVA' AND stripe_subscription_id LIKE 'sim\_sub\_%' ORDER BY vence_en DESC LIMIT 1`,
      [tenantId],
    );
    if (!sus) throw new ConflictException('Tu tienda no tiene una suscripción simulada activa.');

    const finActual = new Date(sus.vence_en);
    const finNuevo = new Date(finActual);
    if (sus.periodo === 'ANUAL') finNuevo.setFullYear(finNuevo.getFullYear() + 1);
    else finNuevo.setMonth(finNuevo.getMonth() + 1);

    const factura = {
      id: `sim_in_${randomUUID()}`,
      billing_reason: 'subscription_cycle',
      amount_paid: Math.round(Number(sus.monto) * 100),
      currency: sus.moneda,
      parent: { subscription_details: { subscription: sus.stripe_subscription_id } },
      lines: { data: [{ period: { end: Math.floor(finNuevo.getTime() / 1000) } }] },
    };
    const tipo = resultado === 'EXITOSO' ? 'invoice.paid' : 'invoice.payment_failed';
    await this.procesarEvento({ id: `sim_evt_${randomUUID()}`, type: tipo, data: { object: factura } } as unknown as Stripe.Event);
    return this.obtenerMiSuscripcion(tenantId, usuarioId);
  }

  // =========================================================================
  // WEBHOOK: firma y procesamiento atomico e idempotente
  // =========================================================================
  /** Verifies Stripe's signature over the raw body; anything that does not verify is a 400. */
  verificarFirma(cuerpo: Buffer | undefined, firma: string | undefined): Stripe.Event {
    const secreto = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || process.env.STRIPE_WEBHOOK_SECRET;
    if (!secreto) throw new ServiceUnavailableException('El webhook de Stripe no está configurado en el servidor.');
    if (!cuerpo || !firma) throw new BadRequestException('Falta la firma o el cuerpo del webhook.');
    try {
      return this.stripe.webhooks.constructEvent(cuerpo, firma, secreto);
    } catch {
      throw new BadRequestException('La firma del webhook no es válida.');
    }
  }

  async procesarEvento(evento: Stripe.Event): Promise<ResultadoEvento> {
    switch (evento.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const sesion = evento.data.object as Stripe.Checkout.Session;
        if (sesion.metadata?.tipo === 'PLAN') return this.confirmarPagoPlan(evento, sesion);
        if (sesion.metadata?.tipo === 'ALTA_TIENDA') return this.confirmarAltaTienda(evento, sesion);
        return 'IGNORADO';
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const sesion = evento.data.object as Stripe.Checkout.Session;
        const estado = evento.type === 'checkout.session.expired' ? 'EXPIRADA' : 'FALLIDA';
        if (sesion.metadata?.tipo === 'PLAN') return this.cerrarSinPago(evento, sesion, estado);
        if (sesion.metadata?.tipo === 'ALTA_TIENDA') return this.cerrarAltaSinPago(evento, sesion, estado);
        return 'IGNORADO';
      }
      case 'invoice.paid':
        return this.renovarSuscripcion(evento, evento.data.object as Stripe.Invoice);
      case 'invoice.payment_failed':
        return this.marcarCobroFallido(evento, evento.data.object as Stripe.Invoice);
      case 'customer.subscription.updated':
        return this.sincronizarSuscripcion(evento, evento.data.object as Stripe.Subscription);
      case 'customer.subscription.deleted':
        return this.terminarSuscripcion(evento, evento.data.object as Stripe.Subscription);
      default:
        return 'IGNORADO';
    }
  }

  /** Runs `fn` in one transaction under the given store's context (the webhook has no session of its own). */
  private enTransaccion<T>(tenantId: string, fn: (qr: QueryRunner) => Promise<T>): Promise<T> {
    return TenantContext.runAs(tenantId, undefined, async () => {
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        const resultado = await fn(qr);
        await qr.commitTransaction();
        return resultado;
      } catch (error) {
        await qr.rollbackTransaction();
        throw error;
      } finally {
        await qr.release();
      }
    });
  }

  /** Records the event; false when it was already processed. */
  private async registrarEvento(qr: QueryRunner, evento: Stripe.Event, tenantId: string | null): Promise<boolean> {
    const nuevo = await qr.query(
      `INSERT INTO evento_webhook (stripe_event_id, tipo, tenant_id) VALUES ($1, $2, $3)
       ON CONFLICT (stripe_event_id) DO NOTHING RETURNING stripe_event_id`,
      [evento.id, evento.type, tenantId],
    );
    return nuevo.length > 0;
  }

  private async cerrarEvento(qr: QueryRunner, evento: Stripe.Event, resultado: ResultadoEvento): Promise<ResultadoEvento> {
    if (resultado !== 'PROCESADO') {
      await qr.query('UPDATE evento_webhook SET resultado = $2 WHERE stripe_event_id = $1', [evento.id, resultado]);
    }
    return resultado;
  }

  private idDe(valor: unknown): string | null {
    if (!valor) return null;
    return typeof valor === 'string' ? valor : ((valor as { id?: string }).id ?? null);
  }

  /** The store that owns a Stripe subscription, from the global index (events of a renewal carry no session). */
  private async tiendaDeSuscripcionStripe(stripeSubscriptionId: string | null): Promise<string | null> {
    if (!stripeSubscriptionId) return null;
    const [fila] = await this.dataSource.query('SELECT tienda_id FROM suscripcion_stripe WHERE stripe_subscription_id = $1', [stripeSubscriptionId]);
    return fila?.tienda_id ?? null;
  }

  // ---- compra de plan de una tienda que ya existe -------------------------
  private async confirmarPagoPlan(evento: Stripe.Event, sesion: Stripe.Checkout.Session): Promise<ResultadoEvento> {
    // A completed session can still be waiting for the money (async methods): another event will confirm it
    if (sesion.payment_status !== 'paid') return 'PENDIENTE';

    const tenantId = sesion.metadata?.tenantId;
    if (!tenantId) {
      this.logger.error(`Pago de plan sin tienda en la metadata (sesión ${sesion.id}, evento ${evento.id}).`);
      return 'HUERFANO';
    }

    const stripeSubscriptionId = this.idDe(sesion.subscription);
    const stripeCustomerId = this.idDe(sesion.customer);

    const resultado = await this.enTransaccion(tenantId, async (qr) => {
      if (!(await this.registrarEvento(qr, evento, tenantId))) return 'DUPLICADO' as ResultadoEvento;

      const [suscripcion] = await qr.query(
        `SELECT id, tenant_id, plan, periodo, estado, monto, moneda FROM suscripcion
         WHERE stripe_session_id = $1 FOR UPDATE`,
        [sesion.id],
      );
      if (!suscripcion || suscripcion.tenant_id !== tenantId) {
        this.logger.error(`Pago ${sesion.id} sin suscripción registrada para la tienda ${tenantId}: revisar a mano.`);
        return this.cerrarEvento(qr, evento, 'HUERFANO');
      }
      if (suscripcion.estado === 'ACTIVA') return this.cerrarEvento(qr, evento, 'DUPLICADO');

      // The amount and currency charged must be exactly what we asked for: metadata alone is never trusted
      const montoEsperado = Math.round(Number(suscripcion.monto) * 100);
      if (sesion.amount_total !== montoEsperado || (sesion.currency ?? '').toLowerCase() !== String(suscripcion.moneda).toLowerCase()) {
        this.logger.error(
          `Pago ${sesion.id} rechazado: cobrado ${sesion.amount_total} ${sesion.currency}, esperado ${montoEsperado} ${suscripcion.moneda}.`,
        );
        await qr.query(`UPDATE suscripcion SET estado = 'FALLIDA', actualizado_en = now() WHERE id = $1`, [suscripcion.id]);
        return this.cerrarEvento(qr, evento, 'RECHAZADO');
      }

      const paymentIntent = this.idDe(sesion.payment_intent);
      // Renewing the same plan before it ends stacks the new period after the current one
      await qr.query(
        `UPDATE suscripcion
            SET estado = 'ACTIVA', stripe_payment_intent_id = $2, inicio_en = now(), actualizado_en = now(),
                stripe_subscription_id = $6, stripe_customer_id = $7,
                vence_en = GREATEST(now(), COALESCE((SELECT max(vence_en) FROM suscripcion
                                                      WHERE tenant_id = $3 AND estado = 'ACTIVA' AND plan = $4 AND id <> $1), now()))
                           + CASE WHEN $5::text = 'ANUAL' THEN interval '1 year' ELSE interval '1 month' END
          WHERE id = $1`,
        [suscripcion.id, paymentIntent, tenantId, suscripcion.plan, suscripcion.periodo, stripeSubscriptionId, stripeCustomerId],
      );
      if (stripeSubscriptionId) {
        await qr.query(
          `INSERT INTO suscripcion_stripe (stripe_subscription_id, tienda_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [stripeSubscriptionId, tenantId],
        );
      }
      await qr.query('UPDATE tienda SET plan = $2 WHERE id = $1', [tenantId, suscripcion.plan]);
      // Moving to a higher plan replaces the old subscription, which must stop charging. This runs before the commit:
      // if Stripe cannot cancel it the whole confirmation rolls back and Stripe retries the event, instead of leaving
      // an old subscription that keeps charging while the database says it is cancelled.
      await this.cancelarSuscripcionesAnteriores(qr, tenantId, sesion.id);
      return 'PROCESADO' as ResultadoEvento;
    });
    return resultado;
  }

  /**
   * Cancels (now, no proration) every other live subscription of the store, inside the confirmation's transaction.
   * Already gone on Stripe's side is fine; any other Stripe failure is thrown so nothing is committed.
   */
  private async cancelarSuscripcionesAnteriores(qr: QueryRunner, tenantId: string, sesionNuevaId: string): Promise<void> {
    const anteriores: Array<{ id: string; stripe_subscription_id: string }> = await qr.query(
      `SELECT id, stripe_subscription_id FROM suscripcion
        WHERE tenant_id = $1 AND estado = 'ACTIVA' AND stripe_subscription_id IS NOT NULL AND stripe_session_id <> $2`,
      [tenantId, sesionNuevaId],
    );
    for (const anterior of anteriores) {
      if (!esSimulada(anterior.stripe_subscription_id)) {
        try {
          await this.stripe.subscriptions.cancel(anterior.stripe_subscription_id);
        } catch (error: any) {
          if (error?.code !== 'resource_missing') throw error;
        }
      }
      await qr.query(
        `UPDATE suscripcion SET estado = 'CANCELADA', cancelar_al_vencer = false, vence_en = LEAST(vence_en, now()), actualizado_en = now() WHERE id = $1`,
        [anterior.id],
      );
    }
  }

  private async cerrarSinPago(evento: Stripe.Event, sesion: Stripe.Checkout.Session, estado: 'EXPIRADA' | 'FALLIDA'): Promise<ResultadoEvento> {
    const tenantId = sesion.metadata?.tenantId;
    if (!tenantId) return 'HUERFANO';
    return this.enTransaccion(tenantId, async (qr) => {
      if (!(await this.registrarEvento(qr, evento, tenantId))) return 'DUPLICADO';
      // Only a purchase still waiting for payment can be closed; an active one is never undone by a late event
      await qr.query(
        `UPDATE suscripcion SET estado = $2, actualizado_en = now() WHERE stripe_session_id = $1 AND estado = 'PENDIENTE_PAGO'`,
        [sesion.id, estado],
      );
      return 'PROCESADO';
    });
  }

  // ---- alta de tienda al pagar --------------------------------------------
  private async confirmarAltaTienda(evento: Stripe.Event, sesion: Stripe.Checkout.Session): Promise<ResultadoEvento> {
    if (sesion.payment_status !== 'paid') return 'PENDIENTE';
    if (!this.stores) throw new ServiceUnavailableException('El aprovisionamiento de tiendas no está disponible.');

    const [alta] = await this.dataSource.query('SELECT * FROM alta_tienda WHERE stripe_session_id = $1', [sesion.id]);
    if (!alta) {
      this.logger.error(`Pago de alta ${sesion.id} sin registro de alta (evento ${evento.id}): revisar a mano.`);
      await this.registrarEventoSuelto(evento, 'HUERFANO');
      return 'HUERFANO';
    }
    if (alta.estado === 'ACTIVADA') return 'DUPLICADO';

    // The amount and currency charged must be exactly what we asked for
    const montoEsperado = Math.round(Number(alta.monto) * 100);
    if (sesion.amount_total !== montoEsperado || (sesion.currency ?? '').toLowerCase() !== String(alta.moneda).toLowerCase()) {
      this.logger.error(`Alta ${sesion.id} rechazada: cobrado ${sesion.amount_total} ${sesion.currency}, esperado ${montoEsperado} ${alta.moneda}.`);
      await this.dataSource.query(`UPDATE alta_tienda SET estado = 'FALLIDA', actualizado_en = now() WHERE id = $1 AND estado = 'PENDIENTE_PAGO'`, [alta.id]);
      await this.registrarEventoSuelto(evento, 'RECHAZADO');
      return 'RECHAZADO';
    }

    const stripeSubscriptionId = this.idDe(sesion.subscription);
    const stripeCustomerId = this.idDe(sesion.customer);

    try {
      await this.stores.crearPagada(alta.usuario_id, alta.nombre, alta.plan, async (qr, tienda) => {
        // Everything below commits or rolls back together with the store itself
        const marcada = await qr.query(
          `UPDATE alta_tienda SET estado = 'ACTIVADA', tienda_id = $2, actualizado_en = now()
            WHERE id = $1 AND estado = 'PENDIENTE_PAGO' RETURNING id`,
          [alta.id, tienda.id],
        );
        if (marcada.length === 0 || !(await this.registrarEvento(qr, evento, tienda.id))) throw new AltaYaProcesada();

        await qr.query(
          `INSERT INTO suscripcion (id, tenant_id, usuario_id, plan, periodo, monto, moneda, estado, stripe_session_id,
                                    stripe_subscription_id, stripe_customer_id, inicio_en, vence_en)
           VALUES ($1, $2, $3, $4, $5::text, $6, $7, 'ACTIVA', $8, $9, $10, now(),
                   now() + CASE WHEN $5::text = 'ANUAL' THEN interval '1 year' ELSE interval '1 month' END)`,
          [randomUUID(), tienda.id, alta.usuario_id, alta.plan, alta.periodo, alta.monto, alta.moneda, sesion.id, stripeSubscriptionId, stripeCustomerId],
        );
        if (stripeSubscriptionId) {
          await qr.query(
            `INSERT INTO suscripcion_stripe (stripe_subscription_id, tienda_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [stripeSubscriptionId, tienda.id],
          );
        }
      });
    } catch (error) {
      if (error instanceof AltaYaProcesada) return 'DUPLICADO';
      throw error;
    }
    return 'PROCESADO';
  }

  private async cerrarAltaSinPago(evento: Stripe.Event, sesion: Stripe.Checkout.Session, estado: 'EXPIRADA' | 'FALLIDA'): Promise<ResultadoEvento> {
    if (!(await this.registrarEventoSuelto(evento, 'PROCESADO'))) return 'DUPLICADO';
    // Only a purchase still waiting for payment can be closed; an activated store is never undone by a late event
    await this.dataSource.query(
      `UPDATE alta_tienda SET estado = $2, actualizado_en = now() WHERE stripe_session_id = $1 AND estado = 'PENDIENTE_PAGO'`,
      [sesion.id, estado],
    );
    return 'PROCESADO';
  }

  /** Records an event that belongs to no store (yet); false when it was already recorded. */
  private async registrarEventoSuelto(evento: Stripe.Event, resultado: ResultadoEvento): Promise<boolean> {
    const nuevo = await this.dataSource.query(
      `INSERT INTO evento_webhook (stripe_event_id, tipo, tenant_id, resultado) VALUES ($1, $2, NULL, $3)
       ON CONFLICT (stripe_event_id) DO NOTHING RETURNING stripe_event_id`,
      [evento.id, evento.type, resultado],
    );
    return nuevo.length > 0;
  }

  // ---- ciclo de vida de la suscripcion ------------------------------------
  private subscriptionIdDeFactura(factura: any): string | null {
    // API versions before 2025-03-31 expose invoice.subscription; later ones nest it under invoice.parent
    return this.idDe(factura?.parent?.subscription_details?.subscription ?? factura?.subscription);
  }

  private async renovarSuscripcion(evento: Stripe.Event, factura: Stripe.Invoice): Promise<ResultadoEvento> {
    // The first invoice of a subscription is already handled by its checkout session
    if ((factura as any).billing_reason === 'subscription_create') return 'IGNORADO';

    const stripeSubscriptionId = this.subscriptionIdDeFactura(factura);
    const tenantId = await this.tiendaDeSuscripcionStripe(stripeSubscriptionId);
    if (!tenantId) {
      this.logger.error(`Factura ${factura.id} de una suscripción desconocida (${stripeSubscriptionId}).`);
      await this.registrarEventoSuelto(evento, 'HUERFANO');
      return 'HUERFANO';
    }
    const finPeriodo = (factura.lines?.data?.[0] as any)?.period?.end as number | undefined;
    if (!finPeriodo) return 'IGNORADO';

    return this.enTransaccion(tenantId, async (qr) => {
      if (!(await this.registrarEvento(qr, evento, tenantId))) return 'DUPLICADO';

      const [suscripcion] = await qr.query(
        `SELECT id, monto, moneda FROM suscripcion WHERE stripe_subscription_id = $1 AND estado = 'ACTIVA' FOR UPDATE`,
        [stripeSubscriptionId],
      );
      if (!suscripcion) return this.cerrarEvento(qr, evento, 'HUERFANO');

      const montoEsperado = Math.round(Number(suscripcion.monto) * 100);
      if (factura.amount_paid !== montoEsperado || (factura.currency ?? '').toLowerCase() !== String(suscripcion.moneda).toLowerCase()) {
        this.logger.error(`Renovación ${factura.id} rechazada: cobrado ${factura.amount_paid} ${factura.currency}, esperado ${montoEsperado} ${suscripcion.moneda}.`);
        return this.cerrarEvento(qr, evento, 'RECHAZADO');
      }

      await qr.query(
        `UPDATE suscripcion SET vence_en = GREATEST(vence_en, to_timestamp($2)), ultimo_cobro_fallido_en = NULL, actualizado_en = now() WHERE id = $1`,
        [suscripcion.id, finPeriodo],
      );
      return 'PROCESADO';
    });
  }

  private async marcarCobroFallido(evento: Stripe.Event, factura: Stripe.Invoice): Promise<ResultadoEvento> {
    const stripeSubscriptionId = this.subscriptionIdDeFactura(factura);
    const tenantId = await this.tiendaDeSuscripcionStripe(stripeSubscriptionId);
    if (!tenantId) return 'HUERFANO';
    return this.enTransaccion(tenantId, async (qr) => {
      if (!(await this.registrarEvento(qr, evento, tenantId))) return 'DUPLICADO';
      await qr.query(
        `UPDATE suscripcion SET ultimo_cobro_fallido_en = now(), actualizado_en = now() WHERE stripe_subscription_id = $1 AND estado = 'ACTIVA'`,
        [stripeSubscriptionId],
      );
      return 'PROCESADO';
    });
  }

  private async sincronizarSuscripcion(evento: Stripe.Event, suscripcion: Stripe.Subscription): Promise<ResultadoEvento> {
    const tenantId = await this.tiendaDeSuscripcionStripe(suscripcion.id);
    if (!tenantId) return 'HUERFANO';
    return this.enTransaccion(tenantId, async (qr) => {
      if (!(await this.registrarEvento(qr, evento, tenantId))) return 'DUPLICADO';
      await qr.query(
        `UPDATE suscripcion SET cancelar_al_vencer = $2, actualizado_en = now() WHERE stripe_subscription_id = $1 AND estado = 'ACTIVA'`,
        [suscripcion.id, Boolean(suscripcion.cancel_at_period_end)],
      );
      return 'PROCESADO';
    });
  }

  private async terminarSuscripcion(evento: Stripe.Event, suscripcion: Stripe.Subscription): Promise<ResultadoEvento> {
    const tenantId = await this.tiendaDeSuscripcionStripe(suscripcion.id);
    if (!tenantId) return 'HUERFANO';
    return this.enTransaccion(tenantId, async (qr) => {
      if (!(await this.registrarEvento(qr, evento, tenantId))) return 'DUPLICADO';
      // Stripe sends this when the paid period ended or it gave up collecting: nothing renews, the plan falls back
      await qr.query(
        `UPDATE suscripcion SET estado = 'CANCELADA', cancelar_al_vencer = false, vence_en = LEAST(vence_en, now()), actualizado_en = now()
          WHERE stripe_subscription_id = $1 AND estado = 'ACTIVA'`,
        [suscripcion.id],
      );
      return 'PROCESADO';
    });
  }
}
