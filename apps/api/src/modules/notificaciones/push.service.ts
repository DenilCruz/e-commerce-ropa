import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PushSubscriptionEntity } from './entities/push-subscription.entity';
import { MensajePush, PUSH_SENDER, PushSender } from './push-sender';

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
      endpoint: datos.endpoint,
      p256dh: datos.keys.p256dh,
      auth: datos.keys.auth,
    });
  }

  async cancelar(endpoint: string): Promise<void> {
    await this.repo.delete({ endpoint });
  }

  /** Sends the message to every subscribed browser of the active store. Never throws; returns how many were delivered. */
  async notificarTienda(mensaje: MensajePush): Promise<number> {
    if (!this.sender.enabled) return 0;
    try {
      const suscripciones = await this.repo.find({ where: { tenantId: TenantContext.require() } });
      const resultados = await Promise.allSettled(suscripciones.map((s) => this.sender.send(s, mensaje)));
      let entregadas = 0;
      for (const [i, r] of resultados.entries()) {
        if (r.status === 'fulfilled') {
          entregadas += 1;
        } else if ([404, 410].includes((r.reason as any)?.statusCode)) {
          // The browser unsubscribed or the subscription expired: it will never work again
          await this.repo.delete({ id: suscripciones[i].id });
        } else {
          this.logger.warn(`No se pudo enviar la notificación: ${(r.reason as Error)?.message}`);
        }
      }
      return entregadas;
    } catch (err) {
      this.logger.warn(`No se pudo notificar a la tienda: ${(err as Error)?.message}`);
      return 0;
    }
  }
}
