import { describe, expect, it } from 'vitest';
import { limpiarParametros, formatearFecha, formatearUsd, porcentaje, rangoPagina, situacionVencimiento, sumarConteos } from '../lib/formato';

describe('formatearUsd', () => {
  it('muestra dólares con dos decimales y separador de miles', () => {
    expect(formatearUsd(20)).toBe('$20.00');
    expect(formatearUsd('1234.5')).toBe('$1,234.50');
    expect(formatearUsd(0)).toBe('$0.00');
  });

  it('trata valores no numéricos como cero', () => {
    expect(formatearUsd(null)).toBe('$0.00');
    expect(formatearUsd(undefined)).toBe('$0.00');
    expect(formatearUsd('abc')).toBe('$0.00');
  });
});

describe('formatearFecha', () => {
  it('ordena día/mes/año', () => {
    expect(formatearFecha('2026-03-07T10:00:00Z')).toBe('07/03/2026');
  });

  it('usa un guion cuando no hay fecha o es inválida', () => {
    expect(formatearFecha(null)).toBe('—');
    expect(formatearFecha('no es fecha')).toBe('—');
  });
});

describe('situacionVencimiento', () => {
  const ahora = new Date('2026-06-15T12:00:00Z');
  it('clasifica por cercanía al vencimiento', () => {
    expect(situacionVencimiento(null, ahora)).toBe('sin-fecha');
    expect(situacionVencimiento('2026-06-01T00:00:00Z', ahora)).toBe('vencido');
    expect(situacionVencimiento('2026-06-18T00:00:00Z', ahora)).toBe('por-vencer');
    expect(situacionVencimiento('2026-09-01T00:00:00Z', ahora)).toBe('vigente');
  });
});

describe('conteos y paginación', () => {
  it('suma conteos e ignora valores inválidos', () => {
    expect(sumarConteos({ ACTIVA: 3, SUSPENDIDA: 1 })).toBe(4);
    expect(sumarConteos(undefined)).toBe(0);
  });

  it('calcula porcentajes sin dividir entre cero', () => {
    expect(porcentaje(1, 4)).toBe(25);
    expect(porcentaje(3, 0)).toBe(0);
  });

  it('describe el rango visible de una página', () => {
    expect(rangoPagina(1, 20, 0)).toBe('0 resultados');
    expect(rangoPagina(3, 20, 45)).toBe('41-45 de 45');
    expect(rangoPagina(1, 20, 45)).toBe('1-20 de 45');
  });
});

describe('limpiarParametros', () => {
  it('envía solo los filtros elegidos', () => {
    expect(limpiarParametros({ busqueda: '', plan: 'ESTANDAR', estado: '', pagina: 2 })).toEqual({ plan: 'ESTANDAR', pagina: 2 });
  });
});
