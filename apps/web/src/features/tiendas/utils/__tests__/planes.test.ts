import { describe, expect, it } from 'vitest';
import { destinoTrasCrearTienda, esBajaDePlan, interpretarCompra, SEGUNDOS_MAXIMOS_DE_ESPERA } from '../planes';
import type { EstadoCompraPlan } from '../../services/planes.api';

const compra = (estado: EstadoCompraPlan['estado'], extra: Partial<EstadoCompraPlan> = {}): EstadoCompraPlan => ({
  estado,
  plan: 'ESTANDAR',
  periodo: 'MENSUAL',
  monto: 199,
  moneda: 'bob',
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

describe('destinoTrasCrearTienda', () => {
  it('lleva a pagar el plan elegido cuando es de pago', () => {
    expect(destinoTrasCrearTienda('ESTANDAR')).toBe('/planes?elegido=ESTANDAR');
    expect(destinoTrasCrearTienda('CORPORATIVO')).toBe('/planes?elegido=CORPORATIVO');
  });

  it('lleva al panel cuando el plan es la prueba o no hay plan', () => {
    expect(destinoTrasCrearTienda('FREE_TRIAL')).toBe('/admin');
    expect(destinoTrasCrearTienda(null)).toBe('/admin');
    expect(destinoTrasCrearTienda('cualquier cosa')).toBe('/admin');
  });
});

describe('interpretarCompra', () => {
  it('espera la confirmación del webhook mientras la compra sigue pendiente', () => {
    expect(interpretarCompra(compra('PENDIENTE_PAGO'), 5)).toEqual({ fase: 'CONFIRMANDO' });
    expect(interpretarCompra(undefined, 0)).toEqual({ fase: 'CONFIRMANDO' });
  });

  it('muestra el plan activado con su vencimiento', () => {
    expect(interpretarCompra(compra('ACTIVA'), 3)).toEqual({ fase: 'ACTIVA', plan: 'ESTANDAR', venceEn: '2026-11-30T00:00:00.000Z' });
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
