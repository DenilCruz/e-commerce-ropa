/**
 * Pure maths behind the predictive dashboards. Nothing here reads the database or invents data:
 * every figure is computed from what it receives, and when there is not enough data it says so.
 *
 * The constants are parameters of the algorithms (how much history is the minimum, how the three RFM
 * dimensions are weighted), not business figures.
 */

/** Completed days of history the sales forecast looks at (today is left out: it is still in progress). */
export const VENTANA_DIAS = 182;
/** Days each model must predict in a test; the history is cut into consecutive windows of this size. */
export const HOLDOUT_DIAS = 14;
/** Days of history a model needs before it is tested on a window. */
export const MIN_ENTRENAMIENTO_DIAS = 42;
/** A model replaces the plain average only if its error is at least this share lower (avoids chasing noise). */
export const MARGEN_MEJORA = 0.02;
/** Recent days used to scale the weekday profile to the current sales level. */
export const NIVEL_RECIENTE_DIAS = 28;
/** Typical range of a day: from the 10th to the 90th percentile of how far days fall from the forecast. */
export const PERCENTIL_RANGO_BAJO = 0.1;
export const PERCENTIL_RANGO_ALTO = 0.9;
/** Projected average vs historical average beyond which the level is called rising or falling. */
export const UMBRAL_TENDENCIA_NIVEL = 0.1;
/** Days with at least one sale needed before a forecast means anything. */
export const MIN_DIAS_CON_VENTAS = 14;
/** Daily slope relative to the daily average below which the trend is considered flat. */
export const UMBRAL_TENDENCIA_RELATIVO = 0.01;
/** R² below which the line explains too little to claim a trend. */
export const R2_MINIMO_TENDENCIA = 0.1;
/** Share of the held-out sales the model must get right (1 - error) to be called high or medium reliability. */
export const PRECISION_ALTA = 0.7;
export const PRECISION_MEDIA = 0.4;

/** Customers with purchases needed before percentiles say anything about a store. */
export const MIN_CLIENTES_RFM = 5;
/** Weights of recency, frequency and monetary value in the churn risk; they add up to 1. */
export const PESOS_RIESGO = { recencia: 0.6, frecuencia: 0.25, monto: 0.15 } as const;
export const CORTE_RIESGO_ALTO = 2 / 3;
export const CORTE_RIESGO_MEDIO = 1 / 3;

/** Times a pair must be bought together to be reported at all. */
export const MIN_FRECUENCIA_CONJUNTA = 3;
/**
 * How many standard deviations above what chance alone would give a pair's co-purchases must be. Chance is
 * the share of orders of each product multiplied together; 3 keeps false pairs rare even when testing many.
 */
export const Z_MINIMO_ASOCIACION = 3;
export const MAX_ASOCIACIONES = 6;

const redondear = (n: number, decimales = 4) => Number(n.toFixed(decimales));

// ---------------------------------------------------------------- sales forecast

export interface Regresion {
  pendiente: number;
  intercepto: number;
  r2: number;
}

/** Least squares over x = 1..n. R² is the share of the variance the line explains (0 when there is none). */
export function regresionLineal(ys: number[]): Regresion {
  const n = ys.length;
  if (n === 0) return { pendiente: 0, intercepto: 0, r2: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  ys.forEach((y, i) => {
    const x = i + 1;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const denominador = n * sumXX - sumX * sumX;
  const pendiente = denominador !== 0 ? (n * sumXY - sumX * sumY) / denominador : 0;
  const intercepto = (sumY - pendiente * sumX) / n;

  const media = sumY / n;
  const ssTotal = ys.reduce((acc, y) => acc + (y - media) ** 2, 0);
  const ssResidual = ys.reduce((acc, y, i) => acc + (y - (pendiente * (i + 1) + intercepto)) ** 2, 0);
  const r2 = ssTotal === 0 ? 0 : Math.max(0, 1 - ssResidual / ssTotal);

  return { pendiente, intercepto, r2 };
}

export type Tendencia = 'ALCISTA' | 'ESTABLE' | 'BAJISTA';

/** The slope is judged against the store's own daily average, so the same line weighs differently at each scale. */
export function clasificarTendencia(datos: { pendiente: number; promedio: number; r2: number }): Tendencia {
  if (datos.promedio <= 0 || datos.r2 < R2_MINIMO_TENDENCIA) return 'ESTABLE';
  const relativa = datos.pendiente / datos.promedio;
  if (Math.abs(relativa) < UMBRAL_TENDENCIA_RELATIVO) return 'ESTABLE';
  return relativa > 0 ? 'ALCISTA' : 'BAJISTA';
}

export type Fiabilidad = 'INSUFICIENTE' | 'BAJA' | 'MEDIA' | 'ALTA';

/** `precision` is measured on held-out days (see ajustarPronostico); null when it could not be measured. */
export function clasificarFiabilidad(precision: number | null, diasConVentas: number): Fiabilidad {
  if (precision === null || diasConVentas < MIN_DIAS_CON_VENTAS) return 'INSUFICIENTE';
  if (precision >= PRECISION_ALTA) return 'ALTA';
  if (precision >= PRECISION_MEDIA) return 'MEDIA';
  return 'BAJA';
}

/** Calendar day in the server's local time ("2026-10-30"); toISOString would move evening orders to tomorrow. */
export function claveDiaLocal(fecha: Date): string {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mm}-${dd}`;
}

export type ModeloPronostico = 'PROMEDIO' | 'REGRESION' | 'DIA_DE_SEMANA' | 'DIA_DE_SEMANA_NIVEL';

export interface Pronostico {
  modelo: ModeloPronostico;
  pendiente: number;
  intercepto: number;
  /** how well a straight line fits the whole history (descriptive only) */
  r2: number;
  /** 1 - WAPE of the chosen model across the test windows; null when it could not be measured */
  precision: number | null;
  wapeModelo: number | null;
  wapeBase: number | null;
  ventanasDePrueba: number;
  /** forecast for the `dias` days that follow the series */
  predecir: (dias: number) => number[];
  /** how far a typical day falls from the forecast: add `bajo` / `alto` (bajo is usually negative) */
  rangoDia: { bajo: number; alto: number };
}

const sumar = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const promediar = (xs: number[]) => (xs.length > 0 ? sumar(xs) / xs.length : 0);

/** Day of the week (0 = Sunday) of a "YYYY-MM-DD" key, in local time. */
export function diaSemanaDe(clave: string): number {
  const [y, m, d] = clave.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Compares the projected daily average with the historical one: how the level is expected to move. */
export function clasificarTendenciaPorNivel(promedioProyectado: number, promedioHistorico: number): Tendencia {
  if (promedioHistorico <= 0) return 'ESTABLE';
  const relativa = (promedioProyectado - promedioHistorico) / promedioHistorico;
  if (Math.abs(relativa) < UMBRAL_TENDENCIA_NIVEL) return 'ESTABLE';
  return relativa > 0 ? 'ALCISTA' : 'BAJISTA';
}

type Predictor = (valores: number[], diasSemana: number[], dias: number) => number[];

/** Average sales of each weekday (falls back to the overall average for a weekday with no data). */
function perfilSemanal(valores: number[], diasSemana: number[]): number[] {
  const general = promediar(valores);
  return Array.from({ length: 7 }, (_, d) => {
    const delDia = valores.filter((_, i) => diasSemana[i] === d);
    return delDia.length > 0 ? promediar(delDia) : general;
  });
}

const siguienteDia = (diasSemana: number[], k: number) => (diasSemana[diasSemana.length - 1] + 1 + k) % 7;

const CANDIDATOS: Record<ModeloPronostico, Predictor> = {
  PROMEDIO: (valores, _dias, n) => Array(n).fill(promediar(valores)),
  REGRESION: (valores, _dias, n) => {
    const { pendiente, intercepto } = regresionLineal(valores);
    return Array.from({ length: n }, (_, k) => Math.max(0, pendiente * (valores.length + 1 + k) + intercepto));
  },
  DIA_DE_SEMANA: (valores, diasSemana, n) => {
    const perfil = perfilSemanal(valores, diasSemana);
    return Array.from({ length: n }, (_, k) => perfil[siguienteDia(diasSemana, k)]);
  },
  DIA_DE_SEMANA_NIVEL: (valores, diasSemana, n) => {
    const perfil = perfilSemanal(valores, diasSemana);
    const general = promediar(valores);
    const nivel = promediar(valores.slice(-NIVEL_RECIENTE_DIAS));
    const escala = general > 0 ? nivel / general : 1;
    return Array.from({ length: n }, (_, k) => perfil[siguienteDia(diasSemana, k)] * escala);
  },
};

/** What each model would have said about the days it was fitted on, used to measure how far days fall from it. */
function ajusteEnMuestra(modelo: ModeloPronostico, valores: number[], diasSemana: number[]): number[] {
  if (modelo === 'REGRESION') {
    const { pendiente, intercepto } = regresionLineal(valores);
    return valores.map((_, i) => Math.max(0, pendiente * (i + 1) + intercepto));
  }
  if (modelo === 'PROMEDIO') return valores.map(() => promediar(valores));
  const perfil = perfilSemanal(valores, diasSemana);
  return valores.map((_, i) => perfil[diasSemana[i]]);
}

function percentil(ordenados: number[], p: number): number {
  if (ordenados.length === 0) return 0;
  const idx = (ordenados.length - 1) * p;
  const bajo = Math.floor(idx);
  const alto = Math.ceil(idx);
  return ordenados[bajo] + (ordenados[alto] - ordenados[bajo]) * (idx - bajo);
}

/**
 * Chooses how to forecast daily sales by testing every candidate model (plain average, trend line, weekday
 * profile, weekday profile scaled to the recent level) on consecutive windows of the history: each is trained
 * on the days before a window and must predict it. The average wins unless another model is clearly better.
 */
export function ajustarPronostico(valores: number[], diasSemana: number[]): Pronostico {
  const n = valores.length;
  const completa = regresionLineal(valores);

  // Consecutive test windows, from the most recent backwards
  const ventanas: number[] = [];
  for (let fin = n; fin - HOLDOUT_DIAS >= MIN_ENTRENAMIENTO_DIAS; fin -= HOLDOUT_DIAS) ventanas.push(fin);

  const ventasPrueba = sumar(ventanas.map((fin) => sumar(valores.slice(fin - HOLDOUT_DIAS, fin))));
  let elegido: ModeloPronostico = 'PROMEDIO';
  let wapeModelo: number | null = null;
  let wapeBase: number | null = null;

  if (ventanas.length > 0 && ventasPrueba > 0) {
    const errorDe = (modelo: ModeloPronostico) => {
      let error = 0;
      for (const fin of ventanas) {
        const entrenamiento = valores.slice(0, fin - HOLDOUT_DIAS);
        const prueba = valores.slice(fin - HOLDOUT_DIAS, fin);
        const prediccion = CANDIDATOS[modelo](entrenamiento, diasSemana.slice(0, fin - HOLDOUT_DIAS), HOLDOUT_DIAS);
        error += prueba.reduce((acc, real, i) => acc + Math.abs(real - prediccion[i]), 0);
      }
      return error / ventasPrueba;
    };

    wapeBase = errorDe('PROMEDIO');
    wapeModelo = wapeBase;
    for (const modelo of ['REGRESION', 'DIA_DE_SEMANA', 'DIA_DE_SEMANA_NIVEL'] as const) {
      const error = errorDe(modelo);
      if (error < wapeBase * (1 - MARGEN_MEJORA) && error < wapeModelo) {
        elegido = modelo;
        wapeModelo = error;
      }
    }
  }

  const ajuste = ajusteEnMuestra(elegido, valores, diasSemana);
  const residuos = valores.map((v, i) => v - ajuste[i]).sort((a, b) => a - b);

  return {
    modelo: elegido,
    pendiente: elegido === 'REGRESION' ? completa.pendiente : 0,
    intercepto: elegido === 'REGRESION' ? completa.intercepto : promediar(valores),
    r2: completa.r2,
    precision: wapeModelo === null ? null : redondear(Math.min(1, Math.max(0, 1 - wapeModelo))),
    wapeModelo: wapeModelo === null ? null : redondear(wapeModelo),
    wapeBase: wapeBase === null ? null : redondear(wapeBase),
    ventanasDePrueba: wapeModelo === null ? 0 : ventanas.length,
    predecir: (dias) => (n > 0 ? CANDIDATOS[elegido](valores, diasSemana, dias) : Array(dias).fill(0)),
    rangoDia: {
      bajo: redondear(percentil(residuos, PERCENTIL_RANGO_BAJO), 2),
      alto: redondear(percentil(residuos, PERCENTIL_RANGO_ALTO), 2),
    },
  };
}

// ---------------------------------------------------------------- churn (RFM)

export interface ClienteRfmEntrada {
  id: string;
  diasSinComprar: number;
  totalCompras: number;
  gastoTotal: number;
}

export interface PuntajeRfm {
  scoreRiesgo: number;
  nivelRiesgo: 'ALTO' | 'MEDIO' | 'BAJO';
  /** 1 (worst) to 3 (best) in each dimension, relative to the store's other customers */
  rfm: { recencia: number; frecuencia: number; monto: number };
}

export interface ResultadoRfm {
  suficiente: boolean;
  compradores: number;
  minimoRequerido: number;
  puntajes: Map<string, PuntajeRfm>;
}

/** Share of the population below `valor`, counting ties as half: a value in 0..1 that never reaches the ends. */
function rangoPercentil(valores: number[], valor: number): number {
  const menores = valores.filter((v) => v < valor).length;
  const iguales = valores.filter((v) => v === valor).length;
  return (menores + 0.5 * iguales) / valores.length;
}

const puntajeTercil = (rango: number) => Math.min(3, 1 + Math.floor(rango * 3));

/**
 * Churn risk from recency, frequency and monetary value ranked against the store's own buyers.
 * It is a relative risk: it says who is worse off than the rest of the customers, so it needs enough of them.
 */
export function puntuarRiesgoRfm(clientes: ClienteRfmEntrada[]): ResultadoRfm {
  const resultado: ResultadoRfm = {
    suficiente: clientes.length >= MIN_CLIENTES_RFM,
    compradores: clientes.length,
    minimoRequerido: MIN_CLIENTES_RFM,
    puntajes: new Map(),
  };
  if (!resultado.suficiente) return resultado;

  const dias = clientes.map((c) => c.diasSinComprar);
  const compras = clientes.map((c) => c.totalCompras);
  const montos = clientes.map((c) => c.gastoTotal);

  for (const c of clientes) {
    const rangoDias = rangoPercentil(dias, c.diasSinComprar);
    const rangoCompras = rangoPercentil(compras, c.totalCompras);
    const rangoMonto = rangoPercentil(montos, c.gastoTotal);

    const scoreRiesgo =
      PESOS_RIESGO.recencia * rangoDias +
      PESOS_RIESGO.frecuencia * (1 - rangoCompras) +
      PESOS_RIESGO.monto * (1 - rangoMonto);

    resultado.puntajes.set(c.id, {
      scoreRiesgo: redondear(scoreRiesgo),
      nivelRiesgo: scoreRiesgo >= CORTE_RIESGO_ALTO ? 'ALTO' : scoreRiesgo >= CORTE_RIESGO_MEDIO ? 'MEDIO' : 'BAJO',
      rfm: {
        recencia: puntajeTercil(1 - rangoDias),
        frecuencia: puntajeTercil(rangoCompras),
        monto: puntajeTercil(rangoMonto),
      },
    });
  }
  return resultado;
}

/** Share of buyers who bought at least twice (a measured KPI, not a model output); null with no buyers. */
export function tasaRecompra(comprasPorCliente: number[]): number | null {
  if (comprasPorCliente.length === 0) return null;
  const repiten = comprasPorCliente.filter((compras) => compras >= 2).length;
  return redondear((repiten / comprasPorCliente.length) * 100, 1);
}

// ---------------------------------------------------------------- affinity (market basket)

export interface ParProductos {
  productoAId: string;
  productoANombre: string;
  productoBId: string;
  productoBNombre: string;
  /** orders that contain both products */
  frecuencia: number;
}

export interface AsociacionProducto {
  ranking: number;
  productoA: { id: string; nombre: string };
  productoB: { id: string; nombre: string };
  frecuenciaTransaccional: number;
  soporte: number;
  confianzaAB: number;
  confianzaBA: number;
  lift: number;
  /** how far above the chance expectation the co-purchases are, in standard deviations */
  zScore: number;
  scoreAfinidad: number;
  estrategiaSugerida: string;
}

/**
 * support = P(A and B); confidence A→B = P(B | A); lift = confidence / P(B), where 1 means "no relation".
 * `conteos` holds how many orders contain each product and `totalPedidos` how many orders there are.
 */
export function construirAsociaciones(
  pares: ParProductos[],
  conteos: Map<string, number>,
  totalPedidos: number,
  limite: number = MAX_ASOCIACIONES,
): AsociacionProducto[] {
  if (totalPedidos <= 0) return [];

  const calculadas = pares.flatMap((par) => {
    if (par.frecuencia < MIN_FRECUENCIA_CONJUNTA) return [];
    const pedidosA = conteos.get(par.productoAId);
    const pedidosB = conteos.get(par.productoBId);
    if (!pedidosA || !pedidosB) return [];

    // Under independence the pair would share pedidosA * pedidosB / total orders; keep only clear excesses
    const esperado = (pedidosA * pedidosB) / totalPedidos;
    const zScore = (par.frecuencia - esperado) / Math.sqrt(esperado);
    if (zScore < Z_MINIMO_ASOCIACION) return [];

    const confianzaAB = par.frecuencia / pedidosA;
    const confianzaBA = par.frecuencia / pedidosB;
    return [
      {
        par,
        soporte: par.frecuencia / totalPedidos,
        confianzaAB,
        confianzaBA,
        lift: confianzaAB / (pedidosB / totalPedidos),
        zScore,
      },
    ];
  });

  calculadas.sort((a, b) => b.lift - a.lift || b.par.frecuencia - a.par.frecuencia);

  return calculadas.slice(0, limite).map((c, i) => ({
    ranking: i + 1,
    productoA: { id: c.par.productoAId, nombre: c.par.productoANombre },
    productoB: { id: c.par.productoBId, nombre: c.par.productoBNombre },
    frecuenciaTransaccional: c.par.frecuencia,
    soporte: redondear(c.soporte),
    confianzaAB: redondear(c.confianzaAB),
    confianzaBA: redondear(c.confianzaBA),
    lift: redondear(c.lift),
    zScore: redondear(c.zScore, 2),
    scoreAfinidad: redondear(Math.max(c.confianzaAB, c.confianzaBA)),
    estrategiaSugerida: `Se compraron juntas en ${c.par.frecuencia} de ${totalPedidos} pedidos: ofrecerlas como combo o mostrarlas juntas en la ficha del producto.`,
  }));
}
