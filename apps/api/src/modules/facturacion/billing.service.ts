import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PLANES_CONFIG, PeriodoPlan, PlanLimitsService, TipoPlan, calcularMontoPlan } from '../tiendas/plan-limits.service';

const StripeClient = require('stripe');

/** What happened with a webhook event. Everything but a thrown error is answered with 200 so Stripe stops retrying. */
export type ResultadoEvento = 'PROCESADO' | 'DUPLICADO' | 'PENDIENTE' | 'RECHAZADO' | 'HUERFANO' | 'IGNORADO';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly planLimits: PlanLimitsService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || process.env.STRIPE_SECRET_KEY || '';
    this.stripe = new StripeClient(secretKey, { apiVersion: '2026-08-26.dahlia' });
  }

  // =========================================================================
  // CHECKOUT: abre el cobro. El plan NO cambia aquí; lo cambia el webhook.
  // =========================================================================
  async crearCheckout(tenantId: string, usuarioId: string, plan: string, periodo: PeriodoPlan) {
    const planKey = plan?.toUpperCase() as TipoPlan;
    const monto = calcularMontoPlan(planKey, periodo); // 400 si el plan no se vende
    await this.planLimits.verificarAdministradorDeTienda(tenantId, usuarioId);

    const [usuario] = await this.dataSource.query('SELECT correo FROM usuario WHERE id = $1', [usuarioId]);
    const config = PLANES_CONFIG[planKey];
    const suscripcionId = randomUUID();
    const clientUrl = this.configService.get<string>('APP_URL') || process.env.APP_URL || 'http://localhost:5173';
    const metadata = { tipo: 'PLAN', tenantId, usuarioId, plan: planKey, periodo, suscripcionId };

    const sesion = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: usuario?.correo,
      client_reference_id: suscripcionId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'bob',
            unit_amount: Math.round(monto * 100),
            product_data: {
              name: `${config.nombre} · ${periodo === 'ANUAL' ? '12 meses' : '1 mes'}`,
              description: config.descripcion,
            },
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${clientUrl}/planes/retorno?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/planes?cancelado=1`,
    });

    await this.dataSource.query(
      `INSERT INTO suscripcion (id, tenant_id, usuario_id, plan, periodo, monto, moneda, stripe_session_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'bob', $7)`,
      [suscripcionId, tenantId, usuarioId, planKey, periodo, monto, sesion.id],
    );

    return { url: sesion.url as string, sesionId: sesion.id, suscripcionId, monto, moneda: 'bob' };
  }

  /** Estado de una compra de plan (la pantalla de retorno lo consulta hasta que el webhook la activa). */
  async obtenerEstado(sesionId: string) {
    const [fila] = await this.dataSource.query(
      'SELECT estado, plan, periodo, monto, moneda, vence_en FROM suscripcion WHERE stripe_session_id = $1',
      [sesionId],
    );
    if (!fila) throw new NotFoundException('No existe una compra de plan con esa sesión.');
    return { estado: fila.estado, plan: fila.plan, periodo: fila.periodo, monto: Number(fila.monto), moneda: fila.moneda, venceEn: fila.vence_en };
  }

  // =========================================================================
  // WEBHOOK: firma y procesamiento atómico e idempotente
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
        return sesion.metadata?.tipo === 'PLAN' ? this.confirmarPagoPlan(evento, sesion) : 'IGNORADO';
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const sesion = evento.data.object as Stripe.Checkout.Session;
        if (sesion.metadata?.tipo !== 'PLAN') return 'IGNORADO';
        return this.cerrarSinPago(evento, sesion, evento.type === 'checkout.session.expired' ? 'EXPIRADA' : 'FALLIDA');
      }
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
  private async registrarEvento(qr: QueryRunner, evento: Stripe.Event, tenantId: string): Promise<boolean> {
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

  private async confirmarPagoPlan(evento: Stripe.Event, sesion: Stripe.Checkout.Session): Promise<ResultadoEvento> {
    // A completed session can still be waiting for the money (async methods): another event will confirm it
    if (sesion.payment_status !== 'paid') return 'PENDIENTE';

    const tenantId = sesion.metadata?.tenantId;
    if (!tenantId) {
      this.logger.error(`Pago de plan sin tienda en la metadata (sesión ${sesion.id}, evento ${evento.id}).`);
      return 'HUERFANO';
    }

    return this.enTransaccion(tenantId, async (qr) => {
      if (!(await this.registrarEvento(qr, evento, tenantId))) return 'DUPLICADO';

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

      const paymentIntent = typeof sesion.payment_intent === 'string' ? sesion.payment_intent : sesion.payment_intent?.id ?? null;
      // Renewing the same plan before it ends stacks the new period after the current one
      await qr.query(
        `UPDATE suscripcion
            SET estado = 'ACTIVA', stripe_payment_intent_id = $2, inicio_en = now(), actualizado_en = now(),
                vence_en = GREATEST(now(), COALESCE((SELECT max(vence_en) FROM suscripcion
                                                      WHERE tenant_id = $3 AND estado = 'ACTIVA' AND plan = $4 AND id <> $1), now()))
                           + CASE WHEN $5::text = 'ANUAL' THEN interval '1 year' ELSE interval '1 month' END
          WHERE id = $1`,
        [suscripcion.id, paymentIntent, tenantId, suscripcion.plan, suscripcion.periodo],
      );
      await qr.query('UPDATE tienda SET plan = $2 WHERE id = $1', [tenantId, suscripcion.plan]);
      return 'PROCESADO';
    });
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
}
