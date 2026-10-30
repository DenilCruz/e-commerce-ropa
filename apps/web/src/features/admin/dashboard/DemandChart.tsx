import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MetricasPredictivasVentas, PuntoSeriePredictiva } from '../types';

interface Props {
  serie: PuntoSeriePredictiva[];
  metricas: MetricasPredictivasVentas;
}

const ALTO = 300;
/** Below this width the chart scrolls inside its box instead of squeezing the bars into unreadable slivers. */
const ANCHO_MINIMO = 420;
const MARGEN = { arriba: 30, derecha: 16, abajo: 34, izquierda: 56 };
// Same palette as the rest of the admin: stone for facts, bronze for estimates
const COLOR = {
  real: '#1c1917',
  proyeccion: '#9B7B54',
  proyeccionOscuro: '#83653F',
  guia: '#E7E1D7',
  base: '#d6d3d1',
  promedio: '#a8a29e',
  finDeSemana: '#FAF8F5',
  activo: '#F2ECE1',
  texto: '#57534e',
};

const moneda = (n: number) => `$${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monedaCorta = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(n)}`);
const valorDe = (p: PuntoSeriePredictiva) => (p.tipo === 'HISTORICO' ? p.valorReal : p.valorProyectado) ?? 0;

/** "2026-10-29" as a local date (new Date('2026-10-29') would be UTC and can land on the previous day). */
const fechaLocal = (fecha: string) => {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const etiquetaLarga = (p: PuntoSeriePredictiva) =>
  fechaLocal(p.fecha).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
const esFinDeSemana = (p: PuntoSeriePredictiva) => [0, 6].includes(fechaLocal(p.fecha).getDay());

/** Axis with round numbers: about four steps of 1, 2 or 5 times a power of ten. */
function escala(maximo: number) {
  const bruto = Math.max(maximo, 1) / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / potencia;
  const paso = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * potencia;
  const tope = Math.ceil(Math.max(maximo, 1) / paso) * paso;
  return {
    tope,
    ticks: Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso),
  };
}

function useAncho(ref: React.RefObject<HTMLDivElement>) {
  const [ancho, setAncho] = useState(720);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setAncho(el.clientWidth || 720);
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.round(entrada.contentRect.width)));
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref]);
  return ancho;
}

export const DemandChart: React.FC<Props> = ({ serie, metricas }) => {
  const contenedor = useRef<HTMLDivElement>(null);
  const anchoDisponible = useAncho(contenedor);
  const ancho = Math.max(anchoDisponible, ANCHO_MINIMO);
  const [activo, setActivo] = useState<number | null>(null);

  const reales = serie.filter((p) => p.tipo === 'HISTORICO');
  const proyectados = serie.filter((p) => p.tipo === 'PROYECCION');
  const promedio = metricas.promedioDiarioHistorico;

  const { tope, ticks } = useMemo(() => escala(Math.max(...serie.map(valorDe), promedio)), [serie, promedio]);

  const interior = {
    w: Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 160),
    h: ALTO - MARGEN.arriba - MARGEN.abajo,
  };
  const banda = interior.w / Math.max(serie.length, 1);
  const anchoBarra = Math.min(28, Math.max(4, banda * 0.62));
  const yBase = MARGEN.arriba + interior.h;
  const x = (i: number) => MARGEN.izquierda + banda * (i + 0.5);
  const y = (v: number) => yBase - (v / tope) * interior.h;
  const corte = reales.length;
  const xCorte = MARGEN.izquierda + banda * corte;
  const cadaCuantas = Math.max(1, Math.ceil(46 / banda));

  const totalReal = reales.reduce((a, p) => a + (p.valorReal ?? 0), 0);
  const totalProyectado = proyectados.reduce((a, p) => a + (p.valorProyectado ?? 0), 0);
  const variacion = totalReal > 0 && proyectados.length > 0 ? ((totalProyectado - totalReal) / totalReal) * 100 : null;

  const puntosLinea = proyectados.map((p, k) => `${x(corte + k)},${y(p.valorProyectado ?? 0)}`);
  const lineaProyeccion = puntosLinea.length > 0 ? `M${puntosLinea.join(' L')}` : '';
  const areaProyeccion = puntosLinea.length > 0 ? `${lineaProyeccion} L${x(corte + proyectados.length - 1)},${yBase} L${x(corte)},${yBase} Z` : '';

  const moverActivo = (delta: number) => setActivo((actual) => Math.min(serie.length - 1, Math.max(0, (actual ?? Math.max(corte - 1, 0)) + delta)));

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') moverActivo(1);
    else if (e.key === 'ArrowLeft') moverActivo(-1);
    else if (e.key === 'Home') setActivo(0);
    else if (e.key === 'End') setActivo(serie.length - 1);
    else if (e.key === 'Escape') setActivo(null);
    else return;
    e.preventDefault();
  };

  const puntoActivo = activo !== null ? serie[activo] : null;
  const descripcionActiva = puntoActivo
    ? `${etiquetaLarga(puntoActivo)}: ${valorDe(puntoActivo) > 0 ? moneda(valorDe(puntoActivo)) : 'sin ventas'}${
        puntoActivo.tipo === 'PROYECCION' ? ', estimado' : ''
      }`
    : '';

  const modeloTexto =
    metricas.fiabilidad === 'INSUFICIENTE'
      ? metricas.mensaje
      : `Proyección: ${
          metricas.modelo === 'PROMEDIO'
            ? `promedio diario de ${moneda(promedio)} (la tendencia no mejoró la predicción)`
            : `tendencia lineal de ${metricas.pendienteDiaria > 0 ? '+' : ''}${metricas.pendienteDiaria} por día`
        } · precisión medida ${metricas.precision !== null ? `${(metricas.precision * 100).toFixed(0)}%` : 'sin datos'} prediciendo los últimos ${metricas.diasDePrueba} días.`;

  return (
    <div className="space-y-3">
      {/* RESUMEN Y LEYENDA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs text-stone-600">
        <p>
          Últimos {reales.length} días: <strong className="text-stone-900">{moneda(totalReal)}</strong>
          {proyectados.length > 0 ? (
            <>
              {' · '}Próximos {proyectados.length}: <strong className="text-[#83653F]">{moneda(totalProyectado)}</strong>
              {variacion !== null && (
                <span className="text-stone-600">
                  {' '}
                  ({variacion >= 0 ? '+' : ''}
                  {variacion.toFixed(0)}% frente al período real)
                </span>
              )}
            </>
          ) : (
            ' · Sin proyección por falta de historial'
          )}
        </p>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Leyenda del gráfico">
          <li className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-stone-900" aria-hidden /> Ventas reales
          </li>
          {proyectados.length > 0 && (
            <li className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-[#9B7B54]" aria-hidden /> Proyección
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-stone-400" aria-hidden /> Promedio diario
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#FAF8F5] border border-[#E7E1D7]" aria-hidden /> Fin de semana
          </li>
        </ul>
      </div>

      {/* GRÁFICO */}
      <div ref={contenedor} className="w-full overflow-x-auto overflow-y-hidden">
        <div className="relative" style={{ width: ancho }}>
          <svg
            width={ancho}
            height={ALTO}
            viewBox={`0 0 ${ancho} ${ALTO}`}
            tabIndex={0}
            role="img"
            aria-label={`Ventas diarias: ${reales.length} días reales${proyectados.length ? ` y ${proyectados.length} días proyectados` : ''}. Usa las flechas para recorrerlos.`}
            onKeyDown={alTeclear}
            onBlur={() => setActivo(null)}
            onPointerLeave={() => setActivo(null)}
            className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#9B7B54]"
          >
            {/* fines de semana */}
            {serie.map((p, i) =>
              esFinDeSemana(p) ? (
                <rect key={`fs-${p.fecha}`} x={MARGEN.izquierda + banda * i} y={MARGEN.arriba} width={banda} height={interior.h} fill={COLOR.finDeSemana} />
              ) : null,
            )}

            {/* columna activa */}
            {activo !== null && <rect x={MARGEN.izquierda + banda * activo} y={MARGEN.arriba} width={banda} height={interior.h} fill={COLOR.activo} />}

            {/* guías y eje de valores */}
            {ticks.map((t) => (
              <g key={`tick-${t}`}>
                <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(t)} y2={y(t)} stroke={t === 0 ? COLOR.base : COLOR.guia} strokeWidth={1} />
                <text x={MARGEN.izquierda - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={COLOR.texto} className="tabular-nums">
                  {monedaCorta(t)}
                </text>
              </g>
            ))}

            {/* promedio diario */}
            {promedio > 0 && (
              <g>
                <line
                  x1={MARGEN.izquierda}
                  x2={ancho - MARGEN.derecha}
                  y1={y(promedio)}
                  y2={y(promedio)}
                  stroke={COLOR.promedio}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={ancho - MARGEN.derecha - 4}
                  y={y(promedio) - 6}
                  textAnchor="end"
                  fontSize={11}
                  fill={COLOR.texto}
                  className="tabular-nums"
                  style={{
                    paintOrder: 'stroke',
                    stroke: '#fff',
                    strokeWidth: 3,
                  }}
                >
                  Promedio {moneda(promedio)}
                </text>
              </g>
            )}

            {/* ventas reales: barras; un día sin ventas es una marca fina, no una barra */}
            {reales.map((p, i) => {
              const v = p.valorReal ?? 0;
              return v > 0 ? (
                <rect key={p.fecha} x={x(i) - anchoBarra / 2} y={y(v)} width={anchoBarra} height={yBase - y(v)} rx={2} fill={COLOR.real} />
              ) : (
                <rect key={p.fecha} x={x(i) - anchoBarra / 2} y={yBase - 2} width={anchoBarra} height={2} fill={COLOR.base} />
              );
            })}

            {/* proyección: área suave y línea punteada */}
            {proyectados.length > 0 && (
              <g>
                <path d={areaProyeccion} fill={COLOR.proyeccion} fillOpacity={0.12} />
                <path
                  d={lineaProyeccion}
                  fill="none"
                  stroke={COLOR.proyeccion}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {proyectados.map((p, k) => (
                  <circle
                    key={p.fecha}
                    cx={x(corte + k)}
                    cy={y(p.valorProyectado ?? 0)}
                    r={activo === corte + k ? 5 : 3}
                    fill="#fff"
                    stroke={COLOR.proyeccionOscuro}
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}

            {/* separación entre lo real y lo proyectado */}
            {proyectados.length > 0 && (
              <g>
                <line x1={xCorte} x2={xCorte} y1={MARGEN.arriba - 14} y2={yBase} stroke={COLOR.promedio} strokeWidth={1} />
                <text x={xCorte - 6} y={MARGEN.arriba - 6} textAnchor="end" fontSize={11} fontWeight={600} fill={COLOR.real}>
                  Real
                </text>
                <text x={xCorte + 6} y={MARGEN.arriba - 6} fontSize={11} fontWeight={600} fill={COLOR.proyeccionOscuro}>
                  Proyección desde hoy
                </text>
              </g>
            )}

            {/* eje de fechas */}
            {serie.map((p, i) =>
              i % cadaCuantas === 0 ? (
                <text key={`lbl-${p.fecha}`} x={x(i)} y={yBase + 20} textAnchor="middle" fontSize={11} fill={COLOR.texto} className="tabular-nums">
                  {p.label}
                </text>
              ) : null,
            )}

            {/* zonas sensibles: mouse, toque y teclado comparten el mismo estado */}
            {serie.map((p, i) => (
              <rect
                key={`hit-${p.fecha}`}
                x={MARGEN.izquierda + banda * i}
                y={MARGEN.arriba - 14}
                width={banda}
                height={interior.h + 14}
                fill="transparent"
                onPointerEnter={() => setActivo(i)}
                onPointerDown={() => setActivo(i)}
              />
            ))}
          </svg>

          {/* TOOLTIP ÚNICO, DENTRO DEL GRÁFICO */}
          {puntoActivo && activo !== null && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg bg-stone-900 px-3 py-2 text-xs text-white shadow-lg"
              style={{
                left: Math.min(Math.max(x(activo) - 64, 4), Math.max(ancho - 132, 4)),
                top: Math.max(y(valorDe(puntoActivo)) - 66, MARGEN.arriba),
                width: 128,
              }}
            >
              <span className="block text-stone-300 first-letter:uppercase">{etiquetaLarga(puntoActivo)}</span>
              <span className="block text-sm font-semibold tabular-nums">{valorDe(puntoActivo) > 0 ? moneda(valorDe(puntoActivo)) : 'Sin ventas'}</span>
              {puntoActivo.tipo === 'PROYECCION' && <span className="block text-[#d9bf94]">Estimado</span>}
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="sr-only" aria-live="polite">
          {descripcionActiva}
        </p>

        <table className="sr-only">
          <caption>Ventas diarias reales y proyectadas</caption>
          <thead>
            <tr>
              <th>Día</th>
              <th>Tipo</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            {serie.map((p) => (
              <tr key={`fila-${p.fecha}`}>
                <td>{etiquetaLarga(p)}</td>
                <td>{p.tipo === 'HISTORICO' ? 'Real' : 'Estimado'}</td>
                <td>{moneda(valorDe(p))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modeloTexto && <p className="text-xs text-stone-600 leading-relaxed">{modeloTexto}</p>}
    </div>
  );
};
