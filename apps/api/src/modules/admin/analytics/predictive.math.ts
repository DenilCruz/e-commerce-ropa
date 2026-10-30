/**
 * Pure maths behind the predictive dashboards. Nothing here reads the database or invents data:
 * every figure is computed from what it receives, and when there is not enough data it says so.
 *
 * The constants are parameters of the algorithms (how much history is the minimum, how the three RFM
 * dimensions are weighted), not business figures.
 */

/** Completed days of history the sales forecast looks at (today is left out: it is still in progress). */
export const VENTANA_DIAS = 60;
/** Last days held out to test the model: it is trained on the rest and must predict these. */
export const HOLDOUT_DIAS = 14;
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

/** Times a pair must be bought together to be reported (a pair seen twice is noise, however high its lift). */
export const MIN_FRECUENCIA_CONJUNTA = 3;
/** Share of all orders a pair must appear in; it overtakes the fixed minimum in big stores. */
export const MIN_SOPORTE_CONJUNTO = 0.02;
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

export interface Pronostico {
  modelo: 'REGRESION' | 'PROMEDIO';
  pendiente: number;
  intercepto: number;
  /** how well the line fits the whole history (descriptive only) */
  r2: number;
  /** 1 - WAPE of the chosen model on the held-out days; null when it could not be measured */
  precision: number | null;
  wapeModelo: number | null;
  wapeBase: number | null;
}

const sumar = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Picks between a trend line and the plain average by testing both on the last days of the history:
 * each is trained on the earlier days and asked to predict the held-out ones. The average wins ties,
 * so a slope is only used when it actually predicts better than "tomorrow looks like the average".
 */
export function ajustarPronostico(valores: number[]): Pronostico {
  const n = valores.length;
  const completa = regresionLineal(valores);
  const promedio = n > 0 ? sumar(valores) / n : 0;
  const plano = { modelo: 'PROMEDIO' as const, pendiente: 0, intercepto: promedio, r2: completa.r2 };

  const entrenamiento = valores.slice(0, n - HOLDOUT_DIAS);
  const prueba = valores.slice(n - HOLDOUT_DIAS);
  const ventasPrueba = sumar(prueba);
  if (entrenamiento.length < HOLDOUT_DIAS || prueba.length < HOLDOUT_DIAS || ventasPrueba <= 0) {
    return { ...plano, precision: null, wapeModelo: null, wapeBase: null };
  }

  const recta = regresionLineal(entrenamiento);
  const promedioEntrenamiento = sumar(entrenamiento) / entrenamiento.length;
  const wape = (predice: (i: number) => number) =>
    prueba.reduce((acc, real, i) => acc + Math.abs(real - predice(i)), 0) / ventasPrueba;

  const wapeRecta = wape((i) => Math.max(0, recta.pendiente * (entrenamiento.length + 1 + i) + recta.intercepto));
  const wapeBase = wape(() => promedioEntrenamiento);
  const usaRecta = wapeRecta < wapeBase;
  const wapeModelo = usaRecta ? wapeRecta : wapeBase;

  return {
    ...(usaRecta ? { modelo: 'REGRESION' as const, pendiente: completa.pendiente, intercepto: completa.intercepto, r2: completa.r2 } : plano),
    precision: redondear(Math.min(1, Math.max(0, 1 - wapeModelo))),
    wapeModelo: redondear(wapeModelo),
    wapeBase: redondear(wapeBase),
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
  scoreAfinidad: number;
  estrategiaSugerida: string;
}

/** Orders a pair must share to be reported: the fixed minimum, or a share of all orders in big stores. */
export function frecuenciaMinimaConjunta(totalPedidos: number): number {
  return Math.max(MIN_FRECUENCIA_CONJUNTA, Math.ceil(MIN_SOPORTE_CONJUNTO * totalPedidos));
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

  const minimo = frecuenciaMinimaConjunta(totalPedidos);
  const calculadas = pares.flatMap((par) => {
    if (par.frecuencia < minimo) return [];
    const pedidosA = conteos.get(par.productoAId);
    const pedidosB = conteos.get(par.productoBId);
    if (!pedidosA || !pedidosB) return [];

    const confianzaAB = par.frecuencia / pedidosA;
    const confianzaBA = par.frecuencia / pedidosB;
    return [
      {
        par,
        soporte: par.frecuencia / totalPedidos,
        confianzaAB,
        confianzaBA,
        lift: confianzaAB / (pedidosB / totalPedidos),
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
    scoreAfinidad: redondear(Math.max(c.confianzaAB, c.confianzaBA)),
    estrategiaSugerida: `Se compraron juntas en ${c.par.frecuencia} de ${totalPedidos} pedidos: ofrecerlas como combo o mostrarlas juntas en la ficha del producto.`,
  }));
}
