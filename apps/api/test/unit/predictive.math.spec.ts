import {
  MIN_CLIENTES_RFM,
  MIN_DIAS_CON_VENTAS,
  MIN_FRECUENCIA_CONJUNTA,
  ajustarPronostico,
  claveDiaLocal,
  diaSemanaDe,
  clasificarFiabilidad,
  clasificarTendencia,
  clasificarTendenciaPorNivel,
  construirAsociaciones,
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

  it('ordena por lift: un par específico gana al par entre productos más populares', () => {
    const populares = new Map([
      ['A', 20],
      ['B', 10],
      ['C', 30],
    ]);
    const r = construirAsociaciones(
      [
        { productoAId: 'A', productoANombre: 'A', productoBId: 'C', productoBNombre: 'C', frecuencia: 18 },
        { productoAId: 'A', productoANombre: 'A', productoBId: 'B', productoBNombre: 'B', frecuencia: 8 },
      ],
      populares,
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
  const dias = 91;
  const diasSemana = Array.from({ length: dias }, (_, i) => i % 7);
  // ventas con un perfil semanal marcado (fin de semana fuerte) y sin tendencia
  const factores = [1.2, 0.6, 0.7, 0.8, 0.9, 1.3, 1.5];
  const semanal = diasSemana.map((d) => 100 * factores[d]);
  const conTendencia = Array.from({ length: dias }, (_, i) => 100 + i * 5 + (i % 3));
  const constante = Array(dias).fill(250);

  it('elige la regresión cuando hay una tendencia real que predice mejor que el promedio', () => {
    const r = ajustarPronostico(conTendencia, diasSemana);

    expect(r.modelo).toBe('REGRESION');
    expect(r.pendiente).toBeGreaterThan(4);
    expect(r.wapeModelo!).toBeLessThan(r.wapeBase!);
  });

  it('elige un perfil por día de semana cuando el patrón semanal es real', () => {
    const r = ajustarPronostico(semanal, diasSemana);

    expect(['DIA_DE_SEMANA', 'DIA_DE_SEMANA_NIVEL']).toContain(r.modelo);
    expect(r.precision!).toBeGreaterThan(0.9);
  });

  it('proyecta cada día según su día de semana, continuando desde donde termina la serie', () => {
    const r = ajustarPronostico(semanal, diasSemana);
    const siguientes = r.predecir(7); // el último día de la serie es i = 90 -> 90 % 7 = 6, el siguiente es domingo (0)

    siguientes.forEach((valor, k) => expect(valor).toBeCloseTo(100 * factores[(k + 0) % 7], 0));
  });

  it('con una serie constante ningún modelo supera al promedio y se queda con él', () => {
    const r = ajustarPronostico(constante, diasSemana);

    expect(r.modelo).toBe('PROMEDIO');
    expect(r.pendiente).toBe(0);
    expect(r.predecir(3)).toEqual([250, 250, 250]);
  });

  it('exige una mejora mínima sobre el promedio: no cambia de modelo por una diferencia ínfima', () => {
    const casiConstante = constante.map((v, i) => v + (i % 2 === 0 ? 0.01 : -0.01));
    const r = ajustarPronostico(casiConstante, diasSemana);

    expect(r.modelo).toBe('PROMEDIO');
  });

  it('la precisión sale del error medido, no de un valor fijo', () => {
    const r = ajustarPronostico(semanal, diasSemana);

    expect(r.precision).toBeCloseTo(1 - r.wapeModelo!, 6);
  });

  it('el rango típico del día sale de las desviaciones reales y contiene al valor esperado', () => {
    const ruidosa = diasSemana.map((d, i) => 200 + ((i * 37) % 100) - 50);
    const r = ajustarPronostico(ruidosa, diasSemana);

    expect(r.rangoDia.bajo).toBeLessThan(0);
    expect(r.rangoDia.alto).toBeGreaterThan(0);
    expect(ajustarPronostico(constante, diasSemana).rangoDia).toEqual({ bajo: 0, alto: 0 });
  });

  it('sin ventas no puede medirse la precisión', () => {
    const r = ajustarPronostico(Array(dias).fill(0), diasSemana);

    expect(r.precision).toBeNull();
  });

  it('con muy pocos datos devuelve el promedio y precisión nula', () => {
    const r = ajustarPronostico([10, 20, 30], [0, 1, 2]);

    expect(r.modelo).toBe('PROMEDIO');
    expect(r.precision).toBeNull();
  });
});

describe('clasificarTendenciaPorNivel', () => {
  it('compara el nivel proyectado con el histórico', () => {
    expect(clasificarTendenciaPorNivel(130, 100)).toBe('ALCISTA');
    expect(clasificarTendenciaPorNivel(70, 100)).toBe('BAJISTA');
    expect(clasificarTendenciaPorNivel(103, 100)).toBe('ESTABLE');
  });

  it('sin historial no afirma nada', () => {
    expect(clasificarTendenciaPorNivel(50, 0)).toBe('ESTABLE');
  });
});

describe('diaSemanaDe', () => {
  it('devuelve el día de la semana local de una clave YYYY-MM-DD', () => {
    expect(diaSemanaDe('2026-10-30')).toBe(5); // viernes
    expect(diaSemanaDe('2026-10-25')).toBe(0); // domingo
  });
});

describe('clasificarFiabilidad con precisión nula', () => {
  it('es INSUFICIENTE si no se pudo medir la precisión', () => {
    expect(clasificarFiabilidad(null, MIN_DIAS_CON_VENTAS + 10)).toBe('INSUFICIENTE');
  });
});

describe('significancia de la afinidad', () => {
  const par = (a: string, b: string, frecuencia: number) => ({
    productoAId: a,
    productoANombre: a,
    productoBId: b,
    productoBNombre: b,
    frecuencia,
  });

  it('conserva un par comprado juntos mucho más de lo que daría el azar', () => {
    // A y B están en 10 de 100 pedidos: por azar compartirían ~1; compartirlos 5 veces es z = 4
    const r = construirAsociaciones([par('A', 'B', 5)], new Map([['A', 10], ['B', 10]]), 100);

    expect(r).toHaveLength(1);
    expect(r[0].zScore).toBeCloseTo(4, 1);
  });

  it('descarta un par que coincide poco más de lo esperable por azar', () => {
    // esperado ~1 compra conjunta; 3 es z = 2, por debajo del umbral
    const r = construirAsociaciones([par('A', 'B', 3)], new Map([['A', 10], ['B', 10]]), 100);

    expect(r).toEqual([]);
  });

  it('descarta pares de productos muy populares aunque se repitan mucho: es lo esperable', () => {
    // 500 de 1000 pedidos tienen cada uno: por azar compartirían 250; 260 es casi lo mismo
    const r = construirAsociaciones([par('A', 'B', 260)], new Map([['A', 500], ['B', 500]]), 1000);

    expect(r).toEqual([]);
  });

  it('exige además la frecuencia mínima, aunque el z sea alto', () => {
    const r = construirAsociaciones(
      [par('A', 'B', MIN_FRECUENCIA_CONJUNTA - 1)],
      new Map([['A', 2], ['B', 2]]),
      1000,
    );

    expect(r).toEqual([]);
  });
});
