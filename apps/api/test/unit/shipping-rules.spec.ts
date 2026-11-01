import {
  UMBRAL_ENVIO_GRATIS,
  costoDeEnvio,
  diasDeEntrega,
  elegirMetodoPorTipo,
  esEnvioExpress,
} from '../../src/modules/envios/shipping-rules';

describe('shipping rules', () => {
  const estandar = { id: 's', nombre: 'Envío Estándar Atelier', costo: 15 };
  const express = { id: 'x', nombre: 'Envío Express Prioritario', costo: 30 };

  it('charges the configured cost of the standard method below the free threshold', () => {
    expect(costoDeEnvio(estandar, UMBRAL_ENVIO_GRATIS - 0.01)).toBe(15);
  });

  it('makes the standard method free from the threshold', () => {
    expect(costoDeEnvio(estandar, UMBRAL_ENVIO_GRATIS)).toBe(0);
  });

  it('never discounts the express method', () => {
    expect(costoDeEnvio(express, 5000)).toBe(30);
  });

  it('follows a cost edited by the store instead of a fixed number', () => {
    expect(costoDeEnvio({ ...express, costo: '42.50' }, 10)).toBe(42.5);
  });

  it('treats a missing or negative cost as zero', () => {
    expect(costoDeEnvio({ nombre: 'Otro', costo: -5 }, 10)).toBe(0);
    expect(costoDeEnvio({ nombre: 'Otro', costo: 'abc' }, 10)).toBe(0);
  });

  it('recognises express by name and gives it one day', () => {
    expect(esEnvioExpress(express.nombre)).toBe(true);
    expect(diasDeEntrega(express)).toBe(1);
    expect(diasDeEntrega(estandar)).toBe(3);
  });

  describe('elegirMetodoPorTipo', () => {
    it('picks the method that matches the requested type', () => {
      expect(elegirMetodoPorTipo([estandar, express], 'EXPRESS')).toBe(express);
      expect(elegirMetodoPorTipo([express, estandar], 'ESTANDAR')).toBe(estandar);
    });

    it('falls back to the cheapest active method when none matches', () => {
      const unico = { nombre: 'Moto mensajería', costo: 8 };
      const caro = { nombre: 'Courier premium', costo: 20 };
      expect(elegirMetodoPorTipo([caro, unico], 'ESTANDAR')).toBe(unico);
    });

    it('returns null when the store has no active method', () => {
      expect(elegirMetodoPorTipo([], 'ESTANDAR')).toBeNull();
    });
  });
});
