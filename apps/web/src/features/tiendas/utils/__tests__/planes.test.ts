import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  esBajaDePlan,
  expiracionVigente,
  formatearNumeroDeTarjeta,
  guardarAltaPendiente,
  interpretarCompra,
  leerAltaPendiente,
  limpiarAltaPendiente,
  numeroDeTarjetaValido,
  SEGUNDOS_MAXIMOS_DE_ESPERA,
} from '../planes';
import type { EstadoCompraPlan } from '../../services/planes.api';

const compra = (estado: EstadoCompraPlan['estado'], extra: Partial<EstadoCompraPlan> = {}): EstadoCompraPlan => ({
  estado,
  plan: 'ESTANDAR',
  periodo: 'MENSUAL',
  monto: 20,
  moneda: 'usd',
  venceEn: '2026-11-30T00:00:00.000Z',
  ...extra,
});

describe('esBajaDePlan', () => {
  it('bajar de plan no requiere pago; subir o repetir sí', () => {
    expect(esBajaDePlan('CORPORATIVO', 'ESTANDAR')).toBe(true);
    expect(esBajaDePlan('ESTANDAR', 'FREE_TRIAL')).toBe(true);
    expect(esBajaDePlan('FREE_TRIAL', 'ESTANDAR')).toBe(false);
    expect(esBajaDePlan('ESTANDAR', 'CORPORATIVO')).toBe(false);
  });

  it('un plan desconocido o ausente se trata como la prueba gratuita', () => {
    expect(esBajaDePlan(undefined, 'ESTANDAR')).toBe(false);
    expect(esBajaDePlan('RARO', 'FREE_TRIAL')).toBe(false);
  });
});

describe('alta pendiente de tienda', () => {
  const memoria = new Map<string, string>();
  beforeEach(() => {
    memoria.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => void memoria.set(k, v),
      removeItem: (k: string) => void memoria.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('guarda y recupera el nombre, el plan y el período elegidos', () => {
    guardarAltaPendiente({ nombre: '  Moda Luna ', plan: 'ESTANDAR', periodo: 'ANUAL' });

    expect(leerAltaPendiente()).toEqual({ nombre: 'Moda Luna', plan: 'ESTANDAR', periodo: 'ANUAL' });
  });

  it('sin nombre no hay alta pendiente, y un período desconocido es mensual', () => {
    expect(leerAltaPendiente()).toBeNull();
    memoria.set('pending_store_name', 'Moda Luna');
    memoria.set('pending_store_periodo', 'raro');

    expect(leerAltaPendiente()).toEqual({ nombre: 'Moda Luna', plan: 'FREE_TRIAL', periodo: 'MENSUAL' });
  });

  it('limpiar la deja vacía', () => {
    guardarAltaPendiente({ nombre: 'Moda Luna', plan: 'ESTANDAR', periodo: 'MENSUAL' });
    limpiarAltaPendiente();

    expect(leerAltaPendiente()).toBeNull();
  });
});

describe('validación de la tarjeta de la pasarela simulada', () => {
  const AHORA = new Date('2026-11-08T12:00:00Z');

  it('Luhn acepta la tarjeta de prueba y rechaza un dígito cambiado', () => {
    expect(numeroDeTarjetaValido('4242 4242 4242 4242')).toBe(true);
    expect(numeroDeTarjetaValido('4242 4242 4242 4241')).toBe(false);
    expect(numeroDeTarjetaValido('12')).toBe(false);
  });

  it('el vencimiento vale hasta el fin de su mes', () => {
    expect(expiracionVigente('11/26', AHORA)).toBe(true);
    expect(expiracionVigente('10/26', AHORA)).toBe(false);
    expect(expiracionVigente('99/30', AHORA)).toBe(false);
  });

  it('agrupa los dígitos de cuatro en cuatro y descarta lo que no es número', () => {
    expect(formatearNumeroDeTarjeta('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatearNumeroDeTarjeta('42ab42')).toBe('4242');
  });
});

describe('interpretarCompra', () => {
  it('espera la confirmación del webhook mientras la compra sigue pendiente', () => {
    expect(interpretarCompra(compra('PENDIENTE_PAGO'), 5)).toEqual({ fase: 'CONFIRMANDO' });
    expect(interpretarCompra(undefined, 0)).toEqual({ fase: 'CONFIRMANDO' });
  });

  it('muestra el plan activado con su vencimiento', () => {
    expect(interpretarCompra(compra('ACTIVA'), 3)).toEqual({
      fase: 'ACTIVA',
      plan: 'ESTANDAR',
      venceEn: '2026-11-30T00:00:00.000Z',
      tipo: undefined,
      tienda: null,
      nombreTienda: null,
    });
  });

  it('una tienda creada al pagar trae los datos para entrar en ella', () => {
    const tienda = { id: 't-1', slug: 'moda-luna', nombre: 'Moda Luna' };

    expect(interpretarCompra(compra('ACTIVA', { tipo: 'ALTA_TIENDA', tienda, nombreTienda: 'Moda Luna' }), 3)).toMatchObject({
      fase: 'ACTIVA',
      tipo: 'ALTA_TIENDA',
      tienda,
    });
  });

  it('informa cuando el pago no se completó', () => {
    expect(interpretarCompra(compra('EXPIRADA'), 3)).toEqual({ fase: 'NO_COMPLETADO', motivo: 'EXPIRADA' });
    expect(interpretarCompra(compra('FALLIDA'), 3)).toEqual({ fase: 'NO_COMPLETADO', motivo: 'FALLIDA' });
  });

  it('tras esperar demasiado reconoce la demora sin dar el pago por perdido', () => {
    expect(interpretarCompra(compra('PENDIENTE_PAGO'), SEGUNDOS_MAXIMOS_DE_ESPERA)).toEqual({ fase: 'DEMORA' });
  });

  it('una compra activa gana aunque haya pasado mucho tiempo', () => {
    expect(interpretarCompra(compra('ACTIVA'), 500).fase).toBe('ACTIVA');
  });
});
