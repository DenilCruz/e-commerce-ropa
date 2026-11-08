import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Trash2, XCircle } from 'lucide-react';
import { ClienteLocal, EstadoVentaLocal, ProductoLocal, VentaLocal } from '../types';
import { cn } from '../../../lib/utils';
import { RETENCION_DIAS, diasDeAntiguedad, ventaAntigua } from '../services/retencion';
import { nombreCompleto } from '../services/clientesLocales';

interface Props {
  ventas: VentaLocal[];
  /** Customers created on this device (the cached copies of the server list are not shown here). */
  clientes?: ClienteLocal[];
  productos?: ProductoLocal[];
  /** Days after which an unsent sale is flagged as old; the store's setting. */
  retencionDias?: number;
  onReintentarCliente?: (id: string) => void;
  onCancelarCliente?: (id: string) => void;
  onUsarClienteExistente?: (id: string) => void;
  onReintentarProducto?: (id: string) => void;
  onCancelarProducto?: (id: string) => void;
  onCambiarSku?: (id: string, varianteId: string, sku: string) => Promise<unknown>;
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

const ESTADO_REGISTRO: Record<EstadoVentaLocal, string> = {
  PENDIENTE: 'Pendiente de sincronización',
  SINCRONIZANDO: 'Sincronizando',
  SINCRONIZADA: 'Sincronizado',
  CONFLICTO: 'En conflicto',
  ERROR: 'Rechazado por el servidor',
};

const Estado: React.FC<{ estado: EstadoVentaLocal }> = ({ estado }) => {
  const e = ESTADO[estado];
  const Icono = e.icono;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', e.clase)}>
      <Icono className={cn('h-3.5 w-3.5', estado === 'SINCRONIZANDO' && 'motion-safe:animate-spin')} aria-hidden />
      {ESTADO_REGISTRO[estado]}
    </span>
  );
};

/** Edit the SKU of a product that collided with one already in the store, inside the page (no native prompt). */
const EditarSku: React.FC<{ producto: ProductoLocal; onGuardar: (varianteId: string, sku: string) => Promise<unknown> }> = ({ producto, onGuardar }) => {
  const repetidos = new Set((producto.conflicto ?? []).map((c) => c.sku));
  const variantes = producto.variantes.filter((v) => repetidos.has(v.sku) || producto.variantes.length === 1);
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(variantes.map((v) => [v.id, v.sku])));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          for (const v of variantes) if (valores[v.id] !== v.sku) await onGuardar(v.id, valores[v.id]);
        } catch (err: any) {
          setError(err?.message ?? 'No se pudo cambiar el SKU.');
        }
      }}
    >
      {variantes.map((v) => (
        <div key={v.id}>
          <label htmlFor={`sku-${v.id}`} className="block text-xs font-semibold text-red-900">SKU nuevo</label>
          <input
            id={`sku-${v.id}`}
            value={valores[v.id] ?? ''}
            onChange={(e) => setValores((x) => ({ ...x, [v.id]: e.target.value }))}
            className="min-h-[40px] w-full max-w-xs rounded-lg border border-red-300 bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          />
        </div>
      ))}
      {error && <p role="alert" className="text-xs text-red-900">{error}</p>}
      <button type="submit" className={cn(boton, 'border-gray-900 bg-gray-900 text-white hover:bg-black')}>Cambiar SKU y reintentar</button>
    </form>
  );
};

export const ColaSincronizacion: React.FC<Props> = ({
  ventas,
  clientes = [],
  productos = [],
  retencionDias = RETENCION_DIAS,
  onReintentar,
  onAjustar,
  onCancelar,
  onLimpiar,
  onReintentarCliente,
  onCancelarCliente,
  onUsarClienteExistente,
  onReintentarProducto,
  onCancelarProducto,
  onCambiarSku,
}) => {
  const clientesLocales = clientes.filter((c) => c.origen === 'LOCAL');
  const hayHechas = ventas.some((v) => v.estado === 'SINCRONIZADA') || clientesLocales.some((c) => c.estado === 'SINCRONIZADA') || productos.some((p) => p.estado === 'SINCRONIZADA');
  const ordenadas = [...ventas].reverse();
  const hayRegistros = clientesLocales.length > 0 || productos.length > 0;

  return (
    <section aria-labelledby="titulo-cola" className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
        <div>
          <h2 id="titulo-cola" className="text-base font-semibold text-gray-900">Cola de sincronización</h2>
          <p className="text-xs text-gray-500">Clientes, productos y ventas se guardan en este equipo y se envían en ese orden.</p>
        </div>
        {hayHechas && (
          <button type="button" onClick={onLimpiar} className={cn(boton, 'border-gray-200 text-gray-600 hover:bg-gray-100')}>
            Quitar sincronizadas
          </button>
        )}
      </div>

      {clientesLocales.length > 0 && (
        <div className="border-b border-gray-100">
          <h3 className="px-5 pt-4 text-xs font-bold uppercase tracking-wide text-gray-500">Clientes (se envían primero)</h3>
          <ul className="divide-y divide-gray-100">
            {[...clientesLocales].reverse().map((c) => (
              <li key={c.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Cliente: {nombreCompleto(c)}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {new Date(c.creadoEn).toLocaleString('es-BO')}
                      {c.ci ? ` · CI ${c.ci}` : ''}
                      {c.celular ? ` · ${c.celular}` : ''}
                    </p>
                  </div>
                  <Estado estado={c.estado} />
                </div>
                {c.estado === 'PENDIENTE' && c.ultimoError && <p className="text-xs text-amber-800">Último intento: {c.ultimoError}</p>}
                {c.estado === 'CONFLICTO' && (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm text-red-900">
                    <p className="font-medium">
                      Ya existe un cliente con ese CI{c.conflicto ? `: ${c.conflicto.nombre}` : ''}. Puedes usar el que ya existe o cancelar este registro.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => onUsarClienteExistente?.(c.id)} className={cn(boton, 'border-gray-900 bg-gray-900 text-white hover:bg-black')}>
                        Usar el cliente existente
                      </button>
                      <button type="button" onClick={() => onCancelarCliente?.(c.id)} className={cn(boton, 'border-red-300 bg-white text-red-800 hover:bg-red-50')}>
                        Cancelar registro
                      </button>
                    </div>
                  </div>
                )}
                {c.estado === 'ERROR' && (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm text-red-900">
                    <p>{c.ultimoError ?? 'El servidor rechazó el cliente.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => onReintentarCliente?.(c.id)} className={cn(boton, 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100')}>Reintentar</button>
                      <button type="button" onClick={() => onCancelarCliente?.(c.id)} className={cn(boton, 'border-red-300 bg-white text-red-800 hover:bg-red-50')}>Cancelar registro</button>
                    </div>
                  </div>
                )}
                {c.estado === 'PENDIENTE' && (
                  <button type="button" onClick={() => onCancelarCliente?.(c.id)} className={cn(boton, 'border-gray-200 text-gray-600 hover:bg-gray-100')}>
                    <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                    Cancelar registro
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {productos.length > 0 && (
        <div className="border-b border-gray-100">
          <h3 className="px-5 pt-4 text-xs font-bold uppercase tracking-wide text-gray-500">Productos nuevos (se envían antes que las ventas)</h3>
          <ul className="divide-y divide-gray-100">
            {[...productos].reverse().map((p) => (
              <li key={p.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Producto: {p.nombre}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {new Date(p.creadoEn).toLocaleString('es-BO')} · {p.categoriaNombre} · ${p.precio.toFixed(2)} ·{' '}
                      {p.variantes.map((v) => `${v.sku} (${v.stock} u.)`).join(', ')}
                    </p>
                  </div>
                  <Estado estado={p.estado} />
                </div>
                {p.estado === 'PENDIENTE' && p.ultimoError && <p className="text-xs text-amber-800">Último intento: {p.ultimoError}</p>}
                {p.estado === 'CONFLICTO' && (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm text-red-900">
                    <p className="font-medium">
                      El SKU {(p.conflicto ?? []).map((c) => c.sku).join(', ') || 'indicado'} ya existe en la tienda. Cámbialo para reintentar o cancela el producto.
                    </p>
                    {onCambiarSku && <EditarSku producto={p} onGuardar={(varianteId, sku) => onCambiarSku(p.id, varianteId, sku)} />}
                    <div className="mt-3">
                      <button type="button" onClick={() => onCancelarProducto?.(p.id)} className={cn(boton, 'border-red-300 bg-white text-red-800 hover:bg-red-50')}>
                        Cancelar producto
                      </button>
                    </div>
                  </div>
                )}
                {p.estado === 'ERROR' && (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm text-red-900">
                    <p>{p.ultimoError ?? 'El servidor rechazó el producto.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => onReintentarProducto?.(p.id)} className={cn(boton, 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100')}>Reintentar</button>
                      <button type="button" onClick={() => onCancelarProducto?.(p.id)} className={cn(boton, 'border-red-300 bg-white text-red-800 hover:bg-red-50')}>Cancelar producto</button>
                    </div>
                  </div>
                )}
                {p.estado === 'PENDIENTE' && (
                  <button type="button" onClick={() => onCancelarProducto?.(p.id)} className={cn(boton, 'border-gray-200 text-gray-600 hover:bg-gray-100')}>
                    <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                    Cancelar producto
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ordenadas.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">
          {hayRegistros ? 'No hay ventas guardadas en este equipo.' : 'No hay ventas, clientes ni productos guardados en este equipo.'}
        </p>
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
                    {ventaAntigua(v, Date.now(), retencionDias) && (
                      <p className="mt-1 inline-flex rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                        Antigua: lleva {diasDeAntiguedad(v.creadoEn)} día(s) sin enviarse (límite {retencionDias}). Se enviará igual al conectarse.
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-500">
                      {new Date(v.creadoEn).toLocaleString('es-BO')}
                      {v.cliente ? ` · ${nombreCompleto(v.cliente)}` : v.clienteNombre ? ` · ${v.clienteNombre}` : ''}
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
