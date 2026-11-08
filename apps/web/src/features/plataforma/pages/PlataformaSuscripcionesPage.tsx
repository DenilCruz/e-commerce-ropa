import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { plataformaApi, mensajeDeError } from '../services/plataforma.api';
import { ETIQUETA_ESTADO_SUSCRIPCION, ETIQUETA_PLAN, formatearFecha, formatearUsd, rangoPagina } from '../lib/formato';
import { Cargando, ErrorCarga, Etiqueta, FOCO, Paginador, SinResultados } from '../components/ui';
import type { EstadoSuscripcion } from '../types';

const LIMITE = 20;
const COLOR_ESTADO: Record<EstadoSuscripcion, 'verde' | 'ambar' | 'rojo' | 'gris'> = {
  ACTIVA: 'verde',
  PENDIENTE_PAGO: 'ambar',
  FALLIDA: 'rojo',
  EXPIRADA: 'gris',
};

export const PlataformaSuscripcionesPage: React.FC = () => {
  const [estado, setEstado] = useState<EstadoSuscripcion | ''>('');
  const [pagina, setPagina] = useState(1);

  const filtros = { estado, pagina, limite: LIMITE };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['plataforma-suscripciones', filtros],
    queryFn: () => plataformaApi.suscripciones(filtros),
    placeholderData: (anterior) => anterior,
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl text-stone-900">Suscripciones</h2>
        <p className="text-sm text-stone-500">Compras de plan de todas las tiendas, de la más reciente a la más antigua.</p>
      </div>

      <label className="block w-fit">
        <span className="block text-[11px] uppercase tracking-widest font-semibold text-stone-500 mb-1">Estado</span>
        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoSuscripcion | '');
            setPagina(1);
          }}
          className={`rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ${FOCO}`}
        >
          <option value="">Todos</option>
          {(Object.keys(ETIQUETA_ESTADO_SUSCRIPCION) as EstadoSuscripcion[]).map((s) => (
            <option key={s} value={s}>{ETIQUETA_ESTADO_SUSCRIPCION[s]}</option>
          ))}
        </select>
      </label>

      <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden" aria-busy={isFetching}>
        {isLoading ? (
          <Cargando texto="Cargando suscripciones" />
        ) : error || !data ? (
          <ErrorCarga mensaje={mensajeDeError(error)} onReintentar={() => refetch()} />
        ) : data.items.length === 0 ? (
          <SinResultados texto="Todavía no hay suscripciones con este filtro." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Suscripciones de la plataforma</caption>
                <thead className="bg-stone-50 text-left text-[11px] uppercase tracking-widest text-stone-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Tienda</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Periodo</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Monto</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Inicio</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Vence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.items.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-semibold text-stone-900">{s.tiendaNombre}</td>
                      <td className="px-4 py-3"><Etiqueta color="dorado">{ETIQUETA_PLAN[s.plan] ?? s.plan}</Etiqueta></td>
                      <td className="px-4 py-3 text-stone-700">{s.periodo === 'ANUAL' ? 'Anual' : 'Mensual'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {s.moneda === 'USD' ? formatearUsd(s.monto) : `${s.monto.toFixed(2)} ${s.moneda}`}
                      </td>
                      <td className="px-4 py-3"><Etiqueta color={COLOR_ESTADO[s.estado] ?? 'gris'}>{ETIQUETA_ESTADO_SUSCRIPCION[s.estado] ?? s.estado}</Etiqueta></td>
                      <td className="px-4 py-3 whitespace-nowrap text-stone-700">{formatearFecha(s.inicioEn)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-stone-700">{formatearFecha(s.venceEn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginador pagina={data.pagina} totalPaginas={data.totalPaginas} resumen={rangoPagina(data.pagina, data.limite, data.total)} onCambiar={setPagina} />
          </>
        )}
      </div>
    </div>
  );
};
