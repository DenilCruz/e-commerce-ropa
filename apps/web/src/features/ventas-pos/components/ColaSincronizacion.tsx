import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Trash2, XCircle } from 'lucide-react';
import { EstadoVentaLocal, VentaLocal } from '../types';
import { cn } from '../../../lib/utils';
import { RETENCION_DIAS, diasDeAntiguedad, ventaAntigua } from '../services/retencion';

interface Props {
  ventas: VentaLocal[];
  onReintentar: (id: string) => void;
  onAjustar: (venta: VentaLocal) => void;
  onCancelar: (id: string) => void;
  onLimpiar: () => void;
}

const ESTADO: Record<EstadoVentaLocal, { texto: string; icono: React.ElementType; clase: string }> = {
  PENDIENTE: { texto: 'Pendiente de sincronización', icono: Clock, clase: 'bg-amber-50 text-amber-900 border-amber-200' },
  SINCRONIZANDO: { texto: 'Sincronizando', icono: Loader2, clase: 'bg-blue-50 text-blue-800 border-blue-200' },
  SINCRONIZADA: { texto: 'Sincronizada', icono: CheckCircle2, clase: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  CONFLICTO: { texto: 'Venta en conflicto / quiebre de stock', icono: AlertTriangle, clase: 'bg-red-50 text-red-800 border-red-200' },
  ERROR: { texto: 'Rechazada por el servidor', icono: XCircle, clase: 'bg-red-50 text-red-800 border-red-200' },
};

const boton =
  'inline-flex min-h-[40px] items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900';

export const ColaSincronizacion: React.FC<Props> = ({ ventas, onReintentar, onAjustar, onCancelar, onLimpiar }) => {
  const hayHechas = ventas.some((v) => v.estado === 'SINCRONIZADA');
  const ordenadas = [...ventas].reverse();

  return (
    <section aria-labelledby="titulo-cola" className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
        <div>
          <h2 id="titulo-cola" className="text-base font-semibold text-gray-900">Cola de sincronización</h2>
          <p className="text-xs text-gray-500">Las ventas se guardan en este equipo y se envían en el orden en que se hicieron.</p>
        </div>
        {hayHechas && (
          <button type="button" onClick={onLimpiar} className={cn(boton, 'border-gray-200 text-gray-600 hover:bg-gray-100')}>
            Quitar sincronizadas
          </button>
        )}
      </div>

      {ordenadas.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">No hay ventas guardadas en este equipo.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {ordenadas.map((v) => {
            const e = ESTADO[v.estado];
            const Icono = e.icono;
            return (
              <li key={v.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {v.items.map((i) => `${i.cantidad} × ${i.nombre} (${i.talla}, ${i.color})`).join(' · ')}
                    </p>
                    {ventaAntigua(v) && (
                      <p className="mt-1 inline-flex rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                        Antigua: lleva {diasDeAntiguedad(v.creadoEn)} día(s) sin enviarse (límite {RETENCION_DIAS}). Se enviará igual al conectarse.
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-500">
                      {new Date(v.creadoEn).toLocaleString('es-BO')}
                      {v.clienteNombre ? ` · ${v.clienteNombre}` : ''}
                      {v.ordenNro ? ` · Pedido ${v.ordenNro}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-gray-900">${v.total.toFixed(2)}</span>
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', e.clase)}>
                      <Icono className={cn('h-3.5 w-3.5', v.estado === 'SINCRONIZANDO' && 'animate-spin')} aria-hidden />
                      {e.texto}
                    </span>
                  </div>
                </div>

                {v.estado === 'CONFLICTO' && (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm text-red-900">
                    <p className="font-medium">Otro vendedor se llevó parte del stock antes de que esta venta llegara. No se cobró ni se descontó nada.</p>
                    <ul className="mt-1 list-disc pl-5">
                      {(v.conflicto ?? []).map((c) => (
                        <li key={c.varianteId}>
                          {c.nombre ?? 'Prenda'}: pediste {c.solicitado}, quedan {c.disponible}.
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => onAjustar(v)} className={cn(boton, 'border-gray-900 bg-gray-900 text-white hover:bg-black')}>
                        Vender solo lo disponible
                      </button>
                      <button type="button" onClick={() => onReintentar(v.id)} className={cn(boton, 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100')}>
                        Reintentar (ya repuse stock)
                      </button>
                      <button type="button" onClick={() => onCancelar(v.id)} className={cn(boton, 'border-red-300 bg-white text-red-800 hover:bg-red-50')}>
                        Cancelar venta
                      </button>
                    </div>
                  </div>
                )}

                {v.estado === 'ERROR' && (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm text-red-900">
                    <p>{v.ultimoError ?? 'El servidor rechazó la venta.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => onReintentar(v.id)} className={cn(boton, 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100')}>
                        Reintentar
                      </button>
                      <button type="button" onClick={() => onCancelar(v.id)} className={cn(boton, 'border-red-300 bg-white text-red-800 hover:bg-red-50')}>
                        Cancelar venta
                      </button>
                    </div>
                  </div>
                )}

                {v.estado === 'PENDIENTE' && (
                  <div className="flex flex-wrap items-center gap-3">
                    {v.ultimoError && <p className="text-xs text-amber-800">Último intento: {v.ultimoError}</p>}
                    <button type="button" onClick={() => onCancelar(v.id)} className={cn(boton, 'border-gray-200 text-gray-600 hover:bg-gray-100')}>
                      <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                      Cancelar venta
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
