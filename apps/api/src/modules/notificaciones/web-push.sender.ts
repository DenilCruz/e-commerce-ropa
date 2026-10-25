import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MensajePush, PushSender } from './push-sender';
import { PushSubscriptionEntity } from './entities/push-subscription.entity';

/** Web Push with VAPID. Needs VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (generate them with `npx web-push generate-vapid-keys`). */
@Injectable()
export class WebPushSender implements PushSender {
  private readonly logger = new Logger(WebPushSender.name);
  readonly enabled: boolean;
  readonly publicKey: string;
  private lib: any;

  constructor(config: ConfigService) {
    const publica = config.get<string>('VAPID_PUBLIC_KEY') ?? '';
    const privada = config.get<string>('VAPID_PRIVATE_KEY') ?? '';
    this.publicKey = publica;
    this.enabled = Boolean(publica && privada);
    if (!this.enabled) {
      this.logger.warn('Web Push desactivado: faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.');
      return;
    }
    this.lib = require('web-push');
    this.lib.setVapidDetails(config.get<string>('VAPID_SUBJECT') || 'mailto:admin@aura.local', publica, privada);
  }

  async send(sub: Pick<PushSubscriptionEntity, 'endpoint' | 'p256dh' | 'auth'>, mensaje: MensajePush): Promise<void> {
    await this.lib.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(mensaje),
      { TTL: 60 * 60 },
    );
  }
}
