import {
  HOLDOUT_DIAS,
  MIN_CLIENTES_RFM,
  MIN_DIAS_CON_VENTAS,
  MIN_FRECUENCIA_CONJUNTA,
  ajustarPronostico,
  claveDiaLocal,
  clasificarFiabilidad,
  clasificarTendencia,
  construirAsociaciones,
  frecuenciaMinimaConjunta,
  puntuarRiesgoRfm,
  regresionLineal,
  tasaRecompra,
} from '../../src/modules/admin/analytics/predictive.math';

describe('regresionLineal', () => {
  it('ajusta una recta perfecta con R² = 1', () => {
    const r = regresionLineal([10, 20, 30, 40, 50]);

    expect(r.pendiente).toBeCloseTo(10);
    expect(r.intercepto).toBeCloseTo(0);
    expect(r.r2).toBeCloseTo(1);
  });

  it('da R² bajo cuando los datos son ruido alrededor de una media', () => {
    const r = regresionLineal([5, 100, 3, 98, 4, 101, 2, 99]);

    expect(r.r2).toBeLessThan(0.1);
  });

  it('una serie constante tiene pendiente 0 y R² 0 (sin varianza que explicar)', () => {
    const r = regresionLineal([7, 7, 7, 7]);

    expect(r.pendiente).toBe(0);
    expect(r.r2).toBe(0);
  });

  it('una serie vacía no revienta', () => {
    expect(regresionLineal([])).toEqual({ pendiente: 0, intercepto: 0, r2: 0 });
  });
});

describe('clasificarTendencia', () => {
  it('es ALCISTA con pendiente positiva relevante y buen ajuste', () => {
    expect(clasificarTendencia({ pendiente: 5, promedio: 100, r2: 0.8 })).toBe('ALCISTA');
  });

  it('es BAJISTA con pendiente negativa relevante y buen ajuste', () => {
    expect(clasificarTendencia({ pendiente: -5, promedio: 100, r2: 0.8 })).toBe('BAJISTA');
  });

  it('es ESTABLE si la pendiente es pequeña frente al promedio', () => {
    expect(clasificarTendencia({ pendiente: 0.1, promedio: 100, r2: 0.9 })).toBe('ESTABLE');
  });

  it('es ESTABLE si el ajuste es demasiado malo para afirmar una tendencia', () => {
    expect(clasificarTendencia({ pendiente: 5, promedio: 100, r2: 0.01 })).toBe('ESTABLE');
  });

  it('la misma pendiente pesa distinto según la escala del negocio', () => {
    expect(clasificarTendencia({ pendiente: 2, promedio: 10, r2: 0.8 })).toBe('ALCISTA');
    expect(clasificarTendencia({ pendiente: 2, promedio: 100000, r2: 0.8 })).toBe('ESTABLE');
  });
});

describe('clasificarFiabilidad', () => {
  it('es INSUFICIENTE con menos días con ventas que el mínimo', () => {
    expect(clasificarFiabilidad(0.99, MIN_DIAS_CON_VENTAS - 1)).toBe('INSUFICIENTE');
  });

  it('sube de BAJA a ALTA según R² cuando hay datos suficientes', () => {
    expect(clasificarFiabilidad(0.05, MIN_DIAS_CON_VENTAS)).toBe('BAJA');
    expect(clasificarFiabilidad(0.5, MIN_DIAS_CON_VENTAS)).toBe('MEDIA');
    expect(clasificarFiabilidad(0.9, MIN_DIAS_CON_VENTAS)).toBe('ALTA');
  });
});

describe('puntuarRiesgoRfm', () => {
  const cliente = (id: string, diasSinComprar: number, totalCompras: number, gastoTotal: number) => ({
    id,
    diasSinComprar,
    totalCompras,
    gastoTotal,
  });
  const base = [
    cliente('reciente-fiel', 2, 12, 5000),
    cliente('reciente-medio', 5, 6, 2000),
    cliente('medio', 20, 4, 1200),
    cliente('antiguo-poco', 70, 2, 300),
    cliente('perdido', 120, 1, 90),
  ];

  it('no clasifica nada con menos compradores que el mínimo (no inventa un ranking)', () => {
    const r = puntuarRiesgoRfm(base.slice(0, MIN_CLIENTES_RFM - 1));

    expect(r.suficiente).toBe(false);
    expect(r.puntajes.size).toBe(0);
  });

  it('ordena el riesgo: el que no compra hace mucho y compró poco es el peor', () => {
    const r = puntuarRiesgoRfm(base);

    expect(r.suficiente).toBe(true);
    const riesgo = (id: string) => r.puntajes.get(id)!.scoreRiesgo;
    expect(riesgo('perdido')).toBeGreaterThan(riesgo('antiguo-poco'));
    expect(riesgo('antiguo-poco')).toBeGreaterThan(riesgo('medio'));
    expect(riesgo('medio')).toBeGreaterThan(riesgo('reciente-fiel'));
  });

  it('asigna niveles a partir del riesgo calculado, no de un valor fijo', () => {
    const r = puntuarRiesgoRfm(base);

    expect(r.puntajes.get('perdido')!.nivelRiesgo).toBe('ALTO');
    expect(r.puntajes.get('reciente-fiel')!.nivelRiesgo).toBe('BAJO');
  });

  it('entrega los puntajes R, F y M de 1 a 3 como evidencia del cálculo', () => {
    const p = puntuarRiesgoRfm(base).puntajes.get('reciente-fiel')!;

    expect(p.rfm).toEqual({ recencia: 3, frecuencia: 3, monto: 3 });
    expect(puntuarRiesgoRfm(base).puntajes.get('perdido')!.rfm).toEqual({ recencia: 1, frecuencia: 1, monto: 1 });
  });

  it('el score depende de la base de clientes: el mismo cliente puntúa distinto en otra tienda', () => {
    const solo = { ...cliente('x', 30, 3, 500) };
    const tiendaA = puntuarRiesgoRfm([solo, ...base.slice(0, 4)]).puntajes.get('x')!.scoreRiesgo;
    const tiendaB = puntuarRiesgoRfm([solo, cliente('a', 90, 1, 50), cliente('b', 95, 1, 40), cliente('c', 99, 1, 30), cliente('d', 100, 1, 20)]).puntajes.get('x')!.scoreRiesgo;

    expect(tiendaA).not.toBe(tiendaB);
  });
});

describe('construirAsociaciones', () => {
  const total = 100;
  const conteos = new Map([
    ['A', 20],
    ['B', 10],
    ['C', 50],
  ]);

  it('calcula soporte, confianza y lift con las fórmulas de market basket', () => {
    const [a] = construirAsociaciones(
      [{ productoAId: 'A', productoANombre: 'Prenda A', productoBId: 'B', productoBNombre: 'Prenda B', frecuencia: 8 }],
      conteos,
      total,
    );

    expect(a.soporte).toBeCloseTo(0.08); // 8 / 100
    expect(a.confianzaAB).toBeCloseTo(0.4); // 8 / 20
    expect(a.confianzaBA).toBeCloseTo(0.8); // 8 / 10
    expect(a.lift).toBeCloseTo(4); // 0.4 / (10 / 100)
    expect(a.scoreAfinidad).toBeCloseTo(0.8); // la confianza más alta de las dos direcciones
  });

  it('ordena por lift: un par raro pero específico gana al par entre populares', () => {
    const r = construirAsociaciones(
      [
        { productoAId: 'A', productoANombre: 'A', productoBId: 'C', productoBNombre: 'C', frecuencia: 12 },
        { productoAId: 'A', productoANombre: 'A', productoBId: 'B', productoBNombre: 'B', frecuencia: 8 },
      ],
      conteos,
      total,
    );

    expect(r[0].productoB.id).toBe('B');
    expect(r.map((x) => x.ranking)).toEqual([1, 2]);
  });

  it('devuelve vacío sin pares (no rellena con productos populares)', () => {
    expect(construirAsociaciones([], conteos, total)).toEqual([]);
  });

  it('ignora pares cuyos productos no tienen conteo (datos inconsistentes)', () => {
    const r = construirAsociaciones(
      [{ productoAId: 'Z', productoANombre: 'Z', productoBId: 'B', productoBNombre: 'B', frecuencia: 3 }],
      conteos,
      total,
    );

    expect(r).toEqual([]);
  });
});

describe('tasaRecompra', () => {
  it('es el porcentaje de compradores con dos o más compras', () => {
    expect(tasaRecompra([1, 3, 2, 1])).toBe(50);
    expect(tasaRecompra([1, 1, 1])).toBe(0);
    expect(tasaRecompra([4, 2])).toBe(100);
  });

  it('es null cuando no hay compradores (no inventa un 0%)', () => {
    expect(tasaRecompra([])).toBeNull();
  });
});

describe('claveDiaLocal', () => {
  it('usa el día local: un pedido de las 21:00 sigue siendo de ese día aunque en UTC ya sea mañana', () => {
    expect(claveDiaLocal(new Date(2026, 9, 30, 21, 0, 0))).toBe('2026-10-30');
    expect(claveDiaLocal(new Date(2026, 9, 30, 0, 5, 0))).toBe('2026-10-30');
    expect(claveDiaLocal(new Date(2026, 0, 5, 23, 59, 59))).toBe('2026-01-05');
  });
});

describe('ajustarPronostico', () => {
  const dias = 60;
  const conTendencia = Array.from({ length: dias }, (_, i) => 100 + i * 5 + (i % 3));
  // rises for 46 days, then falls back flat: extrapolating the slope is worse than the average
  const ruido = Array.from({ length: dias }, (_, i) => (i < dias - HOLDOUT_DIAS ? 100 + i * 6 : 180));

  it('elige la regresión cuando la tendencia es real y la demuestra prediciendo los últimos días', () => {
    const r = ajustarPronostico(conTendencia);

    expect(r.modelo).toBe('REGRESION');
    expect(r.pendiente).toBeGreaterThan(4);
    expect(r.wapeModelo!).toBeLessThan(r.wapeBase!);
    expect(r.precision!).toBeGreaterThan(0.8);
  });

  it('cae al promedio cuando la tendencia se revierte y la recta no le gana: proyecta plano', () => {
    const r = ajustarPronostico(ruido);

    expect(r.modelo).toBe('PROMEDIO');
    expect(r.pendiente).toBe(0);
    expect(r.intercepto).toBeCloseTo(ruido.reduce((a, b) => a + b, 0) / ruido.length, 5);
  });

  it('la precisión sale del error medido, no de un valor fijo', () => {
    const r = ajustarPronostico(ruido);

    expect(r.precision).toBeCloseTo(1 - r.wapeModelo!, 6);
  });

  it('no puede evaluarse sin ventas en los días de prueba', () => {
    const r = ajustarPronostico([...conTendencia.slice(0, dias - HOLDOUT_DIAS), ...Array(HOLDOUT_DIAS).fill(0)]);

    expect(r.precision).toBeNull();
  });

  it('con muy pocos datos devuelve el promedio y precisión nula', () => {
    const r = ajustarPronostico([10, 20, 30]);

    expect(r.modelo).toBe('PROMEDIO');
    expect(r.precision).toBeNull();
  });
});

describe('clasificarFiabilidad con precisión nula', () => {
  it('es INSUFICIENTE si no se pudo medir la precisión', () => {
    expect(clasificarFiabilidad(null, MIN_DIAS_CON_VENTAS + 10)).toBe('INSUFICIENTE');
  });
});

describe('soporte mínimo de la afinidad', () => {
  it('exige al menos la frecuencia base en tiendas chicas', () => {
    expect(frecuenciaMinimaConjunta(40)).toBe(MIN_FRECUENCIA_CONJUNTA);
  });

  it('sube con el volumen de pedidos de la tienda', () => {
    expect(frecuenciaMinimaConjunta(10000)).toBeGreaterThan(MIN_FRECUENCIA_CONJUNTA);
  });

  it('descarta pares que no llegan al mínimo, aunque tengan lift enorme', () => {
    const conteos = new Map([
      ['A', 3],
      ['B', 3],
    ]);
    const r = construirAsociaciones(
      [{ productoAId: 'A', productoANombre: 'A', productoBId: 'B', productoBNombre: 'B', frecuencia: MIN_FRECUENCIA_CONJUNTA - 1 }],
      conteos,
      100,
    );

    expect(r).toEqual([]);
  });
});
