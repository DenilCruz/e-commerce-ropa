import { descuentoDeCupon, motivoCuponNoAplicable, ReglasCupon } from '../../src/modules/cupones/coupon-rules';
import { TipoCupon } from '../../src/modules/cupones/entities/coupon.entity';

describe('coupon rules', () => {
  const ahora = new Date('2026-06-15T12:00:00Z');
  const vigente: ReglasCupon = {
    codigo: 'VERANO',
    activo: true,
    fechaInicio: '2026-06-01T00:00:00Z',
    fechaFin: '2026-06-30T23:59:59Z',
    usosMaximos: 10,
    usosActuales: 3,
    montoMinimo: 100,
    usosPorUsuario: 1,
  };
  const motivo = (c: Partial<ReglasCupon>, subtotal = 250, usos = 0) =>
    motivoCuponNoAplicable({ ...vigente, ...c }, subtotal, usos, ahora);

  it('accepts a valid coupon', () => {
    expect(motivo({})).toBeNull();
  });

  it('rejects a deactivated coupon', () => {
    expect(motivo({ activo: false })).toMatch(/desactivado/);
  });

  it('rejects an expired coupon', () => {
    expect(motivo({ fechaFin: '2026-06-10T00:00:00Z' })).toMatch(/expirado/);
  });

  it('rejects a coupon that has not started', () => {
    expect(motivo({ fechaInicio: '2026-07-01T00:00:00Z' })).toMatch(/no está vigente/);
  });

  it('rejects an exhausted coupon', () => {
    expect(motivo({ usosActuales: 10 })).toMatch(/límite máximo/);
  });

  it('has no global limit when usosMaximos is null', () => {
    expect(motivo({ usosMaximos: null, usosActuales: 9999 })).toBeNull();
  });

  it('rejects a purchase under the minimum amount', () => {
    expect(motivo({}, 99.99)).toMatch(/monto mínimo/);
  });

  it('rejects a user who reached their own limit, and ignores the limit when it is zero', () => {
    expect(motivo({}, 250, 1)).toMatch(/límite permitido por usuario/);
    expect(motivo({ usosPorUsuario: 0 }, 250, 50)).toBeNull();
  });

  it('quotes money in dollars, the currency the store charges', () => {
    expect(motivo({}, 50)).toContain('$');
    expect(motivo({}, 50)).not.toContain('Bs.');
  });

  describe('descuentoDeCupon', () => {
    it('applies a percentage and rounds to cents', () => {
      expect(descuentoDeCupon({ tipo: TipoCupon.PORCENTAJE, valor: 15 }, 99.99)).toBe(15);
    });

    it('applies a fixed amount but never more than the subtotal', () => {
      expect(descuentoDeCupon({ tipo: TipoCupon.MONTO_FIJO, valor: 500 }, 120)).toBe(120);
      expect(descuentoDeCupon({ tipo: TipoCupon.MONTO_FIJO, valor: 20 }, 120)).toBe(20);
    });

    it('never goes negative', () => {
      expect(descuentoDeCupon({ tipo: TipoCupon.MONTO_FIJO, valor: -30 }, 120)).toBe(0);
    });
  });
});
