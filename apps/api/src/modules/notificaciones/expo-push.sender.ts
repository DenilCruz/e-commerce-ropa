import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpoPushResult, ExpoSender, MensajePush } from './push-sender';

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
export const EXPO_BATCH_SIZE = 100;

/** Expo Push Service for the mobile app. EXPO_ACCESS_TOKEN is optional (only needed with enhanced security). */
@Injectable()
export class ExpoPushSender implements ExpoSender {
  private readonly logger = new Logger(ExpoPushSender.name);
  private readonly accessToken: string;

  constructor(config: ConfigService) {
    this.accessToken = config.get<string>('EXPO_ACCESS_TOKEN') ?? '';
  }

  async sendBatch(tokens: string[], mensaje: MensajePush): Promise<ExpoPushResult[]> {
    const resultados: ExpoPushResult[] = [];
    for (let i = 0; i < tokens.length; i += EXPO_BATCH_SIZE) {
      resultados.push(...(await this.enviarLote(tokens.slice(i, i + EXPO_BATCH_SIZE), mensaje)));
    }
    return resultados;
  }

  private async enviarLote(tokens: string[], mensaje: MensajePush): Promise<ExpoPushResult[]> {
    const fallo = tokens.map((token) => ({ token, ok: false, remove: false }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        },
        body: JSON.stringify(
          tokens.map((to) => ({ to, title: mensaje.titulo, body: mensaje.cuerpo, data: { url: mensaje.url }, sound: 'default' })),
        ),
      });
      if (!res.ok) {
        this.logger.warn(`Expo respondió ${res.status}.`);
        return fallo;
      }
      const cuerpo = (await res.json()) as { data?: Array<{ status?: string; details?: { error?: string } }> };
      const tickets = cuerpo?.data;
      if (!Array.isArray(tickets)) return fallo;
      return tokens.map((token, i) => {
        const t = tickets[i];
        if (t?.status === 'ok') return { token, ok: true, remove: false };
        return { token, ok: false, remove: t?.details?.error === 'DeviceNotRegistered' };
      });
    } catch (err) {
      this.logger.warn(`No se pudo contactar a Expo: ${(err as Error)?.message}`);
      return fallo;
    }
  }
}
