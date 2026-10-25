import { PushSubscriptionEntity } from './entities/push-subscription.entity';

export const PUSH_SENDER = 'PUSH_SENDER';

export interface MensajePush {
  titulo: string;
  cuerpo: string;
  /** Page to open when the notification is clicked. */
  url?: string;
}

/** Delivers a message to one browser subscription. Kept apart so the service can be tested without the network. */
export interface PushSender {
  /** False when the VAPID keys are not configured: nothing is sent. */
  readonly enabled: boolean;
  readonly publicKey: string;
  send(sub: Pick<PushSubscriptionEntity, 'endpoint' | 'p256dh' | 'auth'>, mensaje: MensajePush): Promise<void>;
}
