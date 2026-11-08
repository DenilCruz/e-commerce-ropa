import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PushSubscriptionEntity } from './entities/push-subscription.entity';
import { EXPO_PUSH_SENDER, ExpoSender, MensajePush, PUSH_SENDER, PushSender } from './push-sender';

export interface SuscripcionPush {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly repo: Repository<PushSubscriptionEntity>,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
    @Optional() @Inject(EXPO_PUSH_SENDER) private readonly expo?: ExpoSender,
  ) {}

  clavePublica() {
    return this.sender.enabled ? { habilitado: true, clave: this.sender.publicKey } : { habilitado: false, clave: null };
  }

  /** Saves the browser's subscription for this store; the same browser subscribing again updates its row. */
  async suscribir(usuarioId: string, datos: SuscripcionPush) {
    const tenantId = TenantContext.require();
    const existente = await this.repo.findOne({ where: { tenantId, endpoint: datos.endpoint } });
    return this.repo.save({
      ...(existente ?? {}),
      tenantId,
      usuarioId,
      canal: 'WEBPUSH' as const,
      endpoint: datos.endpoint,
      p256dh: datos.keys.p256dh,
      auth: datos.keys.auth,
    });
  }

  async cancelar(endpoint: string): Promise<void> {
    await this.repo.delete({ endpoint });
  }

  /** Saves the Expo token of a mobile device; the same token subscribing again updates its row (no duplicates). */
  async suscribirExpo(usuarioId: string, token: string) {
    const tenantId = TenantContext.require();
    const existente = await this.repo.findOne({ where: { tenantId, expoToken: token } });
    return this.repo.save({
      ...(existente ?? {}),
      tenantId,
      usuarioId,
      canal: 'EXPO' as const,
      expoToken: token,
    });
  }

  async cancelarExpo(token: string): Promise<void> {
    await this.repo.delete({ expoToken: token });
  }

  /**
   * Sends the message to every subscribed browser and mobile device of the active store.
   * Never throws; a failing channel never blocks the other. Returns how many were delivered.
   */
  async notificarTienda(mensaje: MensajePush): Promise<number> {
    if (!this.sender.enabled && !this.expo) return 0;
    try {
      const suscripciones = await this.repo.find({ where: { tenantId: TenantContext.require() } });
      const [web, movil] = await Promise.all([
        this.enviarWeb(suscripciones.filter((s) => s.canal !== 'EXPO' && s.endpoint), mensaje),
        this.enviarExpo(suscripciones.filter((s) => s.canal === 'EXPO' && s.expoToken), mensaje),
      ]);
      return web + movil;
    } catch (err) {
      this.logger.warn(`No se pudo notificar a la tienda: ${(err as Error)?.message}`);
      return 0;
    }
  }

  private async enviarWeb(suscripciones: PushSubscriptionEntity[], mensaje: MensajePush): Promise<number> {
    if (!this.sender.enabled || !suscripciones.length) return 0;
    try {
      const resultados = await Promise.allSettled(
        suscripciones.map((s) => this.sender.send({ endpoint: s.endpoint!, p256dh: s.p256dh!, auth: s.auth! }, mensaje)),
      );
      let entregadas = 0;
      for (const [i, r] of resultados.entries()) {
        if (r.status === 'fulfilled') {
          entregadas += 1;
        } else if ([404, 410].includes((r.reason as any)?.statusCode)) {
          // The browser unsubscribed or the subscription expired: it will never work again
          this.logger.log(`Suscripción retirada: el servicio de push respondió ${(r.reason as any).statusCode}.`);
          await this.repo.delete({ id: suscripciones[i].id });
        } else {
          this.logger.warn(`No se pudo enviar la notificación: ${(r.reason as Error)?.message}`);
        }
      }
      return entregadas;
    } catch (err) {
      this.logger.warn(`Falló el canal Web Push: ${(err as Error)?.message}`);
      return 0;
    }
  }

  private async enviarExpo(suscripciones: PushSubscriptionEntity[], mensaje: MensajePush): Promise<number> {
    if (!this.expo || !suscripciones.length) return 0;
    try {
      const resultados = await this.expo.sendBatch(suscripciones.map((s) => s.expoToken!), mensaje);
      let entregadas = 0;
      for (const r of resultados) {
        if (r.ok) {
          entregadas += 1;
        } else if (r.remove) {
          this.logger.log('Token de Expo retirado: el dispositivo ya no está registrado.');
          await this.repo.delete({ expoToken: r.token });
        }
      }
      return entregadas;
    } catch (err) {
      this.logger.warn(`Falló el canal Expo: ${(err as Error)?.message}`);
      return 0;
    }
  }
}
