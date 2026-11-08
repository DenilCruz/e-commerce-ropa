import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, DollarSign, Receipt, Store, TrendingUp } from 'lucide-react';
import { plataformaApi, mensajeDeError } from '../services/plataforma.api';
import { ETIQUETA_ESTADO_TIENDA, ETIQUETA_PLAN, formatearUsd, porcentaje } from '../lib/formato';
import { Cargando, ErrorCarga } from '../components/ui';
import type { EstadoTienda, PlanId } from '../types';

const Kpi: React.FC<{ titulo: string; valor: string; detalle?: string; icono: React.ReactNode }> = ({ titulo, valor, detalle, icono }) => (
  <div className="rounded-2xl bg-white border border-stone-200 p-5">
    <div className="flex items-center justify-between text-stone-500">
      <h3 className="text-[11px] uppercase tracking-widest font-semibold">{titulo}</h3>
      <span className="text-[#9B7B54]" aria-hidden>
        {icono}
      </span>
    </div>
    <p className="mt-3 font-serif text-3xl text-stone-900">{valor}</p>
    {detalle && <p className="mt-1 text-xs text-stone-500">{detalle}</p>}
  </div>
);

const Distribucion: React.FC<{ titulo: string; filas: { clave: string; etiqueta: string; cantidad: number }[] }> = ({ titulo, filas }) => {
  const total = filas.reduce((n, f) => n + f.cantidad, 0);
  return (
    <section aria-label={titulo} className="rounded-2xl bg-white border border-stone-200 p-5">
      <h3 className="text-[11px] uppercase tracking-widest font-semibold text-stone-500">{titulo}</h3>
      <ul className="mt-4 space-y-3">
        {filas.map((f) => (
          <li key={f.clave}>
            <div className="flex justify-between text-sm">
              <span className="text-stone-700">{f.etiqueta}</span>
              <span className="font-semibold text-stone-900">{f.cantidad}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-stone-100" aria-hidden>
              <div className="h-1.5 rounded-full bg-[#9B7B54]" style={{ width: `${porcentaje(f.cantidad, total)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export const PlataformaDashboardPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['plataforma-resumen'], queryFn: plataformaApi.resumen });

  if (isLoading) return <Cargando texto="Calculando resumen" />;
  if (error || !data) return <ErrorCarga mensaje={mensajeDeError(error)} onReintentar={() => refetch()} />;

  const estados = (['ACTIVA', 'SUSPENDIDA'] as EstadoTienda[]).map((clave) => ({
    clave,
    etiqueta: ETIQUETA_ESTADO_TIENDA[clave],
    cantidad: data.porEstado[clave] ?? 0,
  }));
  const planes = (['FREE_TRIAL', 'ESTANDAR', 'CORPORATIVO'] as PlanId[]).map((clave) => ({
    clave,
    etiqueta: ETIQUETA_PLAN[clave],
    cantidad: data.porPlan[clave] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-stone-900">Resumen de la plataforma</h2>
        <p className="text-sm text-stone-500">Valores en dólares estadounidenses (USD).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Tiendas" valor={String(data.tiendasTotal)} detalle={`${data.porEstado.ACTIVA ?? 0} activas`} icono={<Store className="w-4 h-4" />} />
        <Kpi titulo="Nuevas (30 días)" valor={String(data.nuevas30d)} icono={<CalendarPlus className="w-4 h-4" />} />
        <Kpi titulo="MRR estimado" valor={formatearUsd(data.mrrUsd)} detalle={`${data.suscripcionesVigentes} suscripciones vigentes`} icono={<TrendingUp className="w-4 h-4" />} />
        <Kpi titulo="Ingresos del mes" valor={formatearUsd(data.ingresosMesUsd)} detalle="Suscripciones cobradas este mes" icono={<DollarSign className="w-4 h-4" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Distribucion titulo="Tiendas por estado" filas={estados} />
        <Distribucion titulo="Tiendas por plan" filas={planes} />
      </div>

      <p className="flex items-center gap-2 text-xs text-stone-500">
        <Receipt className="w-4 h-4" aria-hidden />
        El MRR cuenta el precio mensual de cada tienda activa con un plan de pago vigente; un plan anual cuenta su precio por mes.
      </p>
    </div>
  );
};
