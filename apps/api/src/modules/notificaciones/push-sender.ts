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
  send(sub: { endpoint: string; p256dh: string; auth: string }, mensaje: MensajePush): Promise<void>;
}

export const EXPO_PUSH_SENDER = 'EXPO_PUSH_SENDER';

export interface ExpoPushResult {
  token: string;
  ok: boolean;
  /** Expo said the token is no longer registered (DeviceNotRegistered): it must be removed. */
  remove: boolean;
}

/** Delivers a message to Expo push tokens (mobile app). Never throws: failures come back per token. */
export interface ExpoSender {
  sendBatch(tokens: string[], mensaje: MensajePush): Promise<ExpoPushResult[]>;
}
