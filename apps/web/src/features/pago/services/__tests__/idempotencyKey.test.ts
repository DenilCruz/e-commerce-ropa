import { describe, expect, it } from 'vitest';
import { claveDeIntento, firmaIntentoPago, recordarClave } from '../idempotencyKey';

const crear = (() => {
  let n = 0;
  return () => `clave-${++n}`;
})();

describe('clave de idempotencia de un pago', () => {
  it('reutiliza la clave en un reintento del mismo intento', () => {
    const firma = firmaIntentoPago(['v1:2'], 40);
    const primero = claveDeIntento(null, firma, crear);
    const reintento = claveDeIntento(primero, firma, crear);
    expect(reintento).toBe(primero);
    expect(reintento.clave).toBe(primero.clave);
  });

  it('rota la clave cuando cambia el carrito', () => {
    const primero = claveDeIntento(null, firmaIntentoPago(['v1:1'], 20), crear);
    const otroCarrito = claveDeIntento(primero, firmaIntentoPago(['v1:2'], 20), crear);
    expect(otroCarrito.clave).not.toBe(primero.clave);
    expect(claveDeIntento(otroCarrito, firmaIntentoPago(['v1:2'], 20), crear)).toBe(otroCarrito);
  });

  it('rota la clave cuando cambia el monto', () => {
    const primero = claveDeIntento(null, firmaIntentoPago(['v1:1'], 20), crear);
    const otroMonto = claveDeIntento(primero, firmaIntentoPago(['v1:1'], 25), crear);
    expect(otroMonto.clave).not.toBe(primero.clave);
  });

  it('recuerda la clave de un reembolso y la rota si cambia el motivo', () => {
    const memoria = new Map();
    const misma = recordarClave(memoria, 'orden-1', firmaIntentoPago({ motivo: 'a' }, 0), crear);
    const reintento = recordarClave(memoria, 'orden-1', firmaIntentoPago({ motivo: 'a' }, 0), crear);
    const otroMotivo = recordarClave(memoria, 'orden-1', firmaIntentoPago({ motivo: 'b' }, 0), crear);
    expect(reintento).toBe(misma);
    expect(otroMotivo).not.toBe(misma);
  });
});
