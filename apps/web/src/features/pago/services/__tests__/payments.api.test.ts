import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('../../../../services/api', () => ({
  api: {
    post: (...args: unknown[]) => post(...args),
    get: vi.fn(),
  },
}));

import { paymentsApi } from '../payments.api';

const UUID = '11111111-1111-4111-8111-111111111111';

function claveDe(call: unknown[]): string | undefined {
  const config = call[2] as { headers?: Record<string, string> } | undefined;
  return config?.headers?.['Idempotency-Key'];
}

describe('POST de pago', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { ok: true, clientSecret: 'cs', sessionId: 'sess' } });
  });

  it('envía Idempotency-Key y el mismo cuerpo de siempre', async () => {
    const cuerpo = { telefono: '700' };
    await paymentsApi.crearIntento(cuerpo, UUID);
    await paymentsApi.crearSesionEmbebida(cuerpo, UUID);
    await paymentsApi.confirmarTarjeta({ paymentIntentId: 'pi_1' }, UUID);
    await paymentsApi.pagoContraEntrega(cuerpo, UUID);
    await paymentsApi.simularPagoQr(
      { solicitudId: 's', direccionEnvio: 'Calle 1', telefono: '700', tipoEnvio: 'ESTANDAR' },
      UUID,
    );
    await paymentsApi.reembolsarPago('orden-1', 'motivo', UUID);

    expect(post.mock.calls.map((c) => c[0])).toEqual([
      '/payments/intent',
      '/payments/embedded-session',
      '/payments/confirm-card',
      '/payments/cash-on-delivery',
      '/payments/qr/simular',
      '/payments/refund/orden-1',
    ]);
    expect(post.mock.calls[0][1]).toEqual(cuerpo);
    expect(post.mock.calls[2][1]).toEqual({ paymentIntentId: 'pi_1' });
    expect(post.mock.calls[5][1]).toEqual({ motivo: 'motivo' });
    for (const call of post.mock.calls) expect(claveDe(call)).toBe(UUID);
  });

  it('un reembolso sin clave explícita manda una y la reutiliza en el mismo intento', async () => {
    await paymentsApi.reembolsarPago('orden-2', 'reclamo');
    await paymentsApi.reembolsarPago('orden-2', 'reclamo');
    const primera = claveDe(post.mock.calls[0]);
    expect(primera).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(claveDe(post.mock.calls[1])).toBe(primera);

    await paymentsApi.reembolsarPago('orden-2', 'otro motivo');
    expect(claveDe(post.mock.calls[2])).not.toBe(primera);
  });
});
