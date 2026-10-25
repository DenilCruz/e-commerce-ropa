import { describe, expect, it } from 'vitest';
import { RETENCION_DIAS, catalogoVencido, edadEnDias, ventaAntigua } from '../retencion';

const DIA = 24 * 60 * 60 * 1000;
const base = new Date('2026-10-01T00:00:00.000Z');
const despues = (dias: number) => new Date(base.getTime() + dias * DIA);

describe('retention policy', () => {
  it('keeps local data for seven days by default', () => {
    expect(RETENCION_DIAS).toBe(7);
  });

  it('measures age in days', () => {
    expect(edadEnDias(base.toISOString(), despues(2.5))).toBe(2.5);
  });

  it('expires the catalog snapshot only after the limit, and always when it was never downloaded', () => {
    expect(catalogoVencido(base.toISOString(), despues(RETENCION_DIAS))).toBe(false);
    expect(catalogoVencido(base.toISOString(), despues(RETENCION_DIAS + 0.01))).toBe(true);
    expect(catalogoVencido(null, base)).toBe(true);
    expect(catalogoVencido('no es una fecha', base)).toBe(true);
  });

  it('flags a queued sale as old only after the limit, using the given limit', () => {
    expect(ventaAntigua(base.toISOString(), despues(3))).toBe(false);
    expect(ventaAntigua(base.toISOString(), despues(8))).toBe(true);
    expect(ventaAntigua(base.toISOString(), despues(3), 2)).toBe(true);
  });
});
