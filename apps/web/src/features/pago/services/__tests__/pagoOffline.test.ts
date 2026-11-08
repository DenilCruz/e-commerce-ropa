import { describe, expect, it } from 'vitest';
import { mensajePagoOffline } from '../pagoOffline';

describe('pagos que no pueden ir sin conexión', () => {
  it('bloquea la tarjeta sin conexión con un mensaje claro', () => {
    expect(mensajePagoOffline('tarjeta', false)).toMatch(/tarjeta/i);
    expect(mensajePagoOffline('tarjeta', false)).toMatch(/conexi[oó]n/i);
  });

  it('bloquea el QR sin conexión con un mensaje claro', () => {
    expect(mensajePagoOffline('qr', false)).toMatch(/QR/);
    expect(mensajePagoOffline('qr', false)).toMatch(/conexi[oó]n/i);
  });

  it('deja el pago contra entrega disponible sin conexión', () => {
    expect(mensajePagoOffline('contra_entrega', false)).toBeNull();
  });

  it('no bloquea la tarjeta ni el QR cuando hay conexión', () => {
    expect(mensajePagoOffline('tarjeta', true)).toBeNull();
    expect(mensajePagoOffline('qr', true)).toBeNull();
  });
});
