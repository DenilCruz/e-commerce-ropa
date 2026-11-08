import { describe, expect, it } from 'vitest';
import { crearGestorClavePago, huellaCarrito } from './claveIntentoPago';

const ids = () => {
  let n = 0;
  return () => `id-${++n}`;
};

describe('payment attempt idempotency key', () => {
  it('reuses one key for retries of the same cart and amount, and rotates when either changes', () => {
    const gestor = crearGestorClavePago(ids());
    const carrito = huellaCarrito([
      { varianteId: 'b', cantidad: 1 },
      { varianteId: 'a', cantidad: 2 },
    ]);
    expect(carrito).toBe(huellaCarrito([{ varianteId: 'a', cantidad: 2 }, { varianteId: 'b', cantidad: 1 }]));

    const primera = gestor.clave(carrito, 40);
    expect(gestor.clave(carrito, 40)).toBe(primera);

    const trasMonto = gestor.clave(carrito, 55);
    expect(trasMonto).not.toBe(primera);
    expect(gestor.clave(carrito, 55)).toBe(trasMonto);

    expect(gestor.clave(huellaCarrito([{ varianteId: 'a', cantidad: 1 }]), 55)).not.toBe(trasMonto);
  });
});
