import React, { useMemo, useRef, useState } from 'react';
import { Minus, Plus, Search, Store, X } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl, cn } from '../../../lib/utils';
import { BotonNotificaciones } from '../components/BotonNotificaciones';
import { ColaSincronizacion } from '../components/ColaSincronizacion';
import { IndicadorConexion } from '../components/IndicadorConexion';
import { useVentasPos } from '../hooks/useVentasPos';
import { CatalogoVencidoError } from '../services/retencion';
import { StockLocalInsuficienteError } from '../services/ventasLocales';

const MAX_RESULTADOS = 60;
const enfoque =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900';

export const AdminPosPage: React.FC = () => {
  const pos = useVentasPos();
  const [busqueda, setBusqueda] = useState('');
  const [ticket, setTicket] = useState<Map<string, number>>(new Map());
  const [cliente, setCliente] = useState('');
  const [registrando, setRegistrando] = useState(false);
  // State updates are asynchronous: only a ref stops a button pressed several times in the same instant
  const registrandoRef = useRef(false);

  const porId = useMemo(() => new Map(pos.catalogo.map((v) => [v.varianteId, v])), [pos.catalogo]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = q
      ? pos.catalogo.filter((v) => `${v.nombre} ${v.sku} ${v.talla} ${v.color} ${v.categoria ?? ''}`.toLowerCase().includes(q))
      : pos.catalogo;
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre) || a.talla.localeCompare(b.talla));
  }, [pos.catalogo, busqueda]);

  const lineas = [...ticket.entries()]
    .map(([id, cantidad]) => ({ variante: porId.get(id), cantidad }))
    .filter((l): l is { variante: NonNullable<typeof l.variante>; cantidad: number } => !!l.variante);
  const total = lineas.reduce((s, l) => s + l.variante.precio * l.cantidad, 0);

  const cambiar = (id: string, delta: number) => {
    const variante = porId.get(id);
    if (!variante) return;
    setTicket((prev) => {
      const siguiente = new Map(prev);
      const cantidad = Math.min((prev.get(id) ?? 0) + delta, variante.stockLocal);
      if (cantidad <= 0) siguiente.delete(id);
      else siguiente.set(id, cantidad);
      return siguiente;
    });
  };

  const registrar = async () => {
    if (!lineas.length || registrandoRef.current) return;
    registrandoRef.current = true;
    setRegistrando(true);
    try {
      const venta = await pos.vender(
        lineas.map((l) => ({ varianteId: l.variante.varianteId, cantidad: l.cantidad })),
        cliente,
      );
      setTicket(new Map());
      setCliente('');
      toast.success(
        pos.isOnline
          ? `Venta registrada por $${venta.total.toFixed(2)}. Enviándola al servidor…`
          : `Venta guardada en este equipo por $${venta.total.toFixed(2)}. Se enviará cuando vuelva la conexión.`,
      );
    } catch (err) {
      toast.error(
        err instanceof StockLocalInsuficienteError || err instanceof CatalogoVencidoError
          ? err.message
          : 'No se pudo guardar la venta en este equipo.',
      );
    } finally {
      registrandoRef.current = false;
      setRegistrando(false);
    }
  };

  const conAccion = (fn: () => Promise<unknown>, errorTexto: string) => () =>
    fn().catch((err) => toast.error(err instanceof StockLocalInsuficienteError ? err.message : errorTexto));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            <Store className="h-8 w-8" aria-hidden />
            Punto de Venta
          </h1>
          <p className="mt-1 text-sm text-gray-500">Ventas de mostrador en efectivo. Funciona sin internet y sincroniza al volver.</p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
        <IndicadorConexion
          isOnline={pos.isOnline}
          pendientes={pos.pendientes}
          sincronizando={pos.sincronizando}
          actualizadoEn={pos.actualizadoEn}
          onSincronizar={pos.sincronizarAhora}
        />
        <BotonNotificaciones />
        </div>
      </header>

      {!pos.sesion && (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          No se pudo leer tu sesión de tienda. Cierra sesión y vuelve a entrar.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="titulo-catalogo" className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h2 id="titulo-catalogo" className="sr-only">Catálogo</h2>
            <label htmlFor="pos-busqueda" className="sr-only">Buscar prenda</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                id="pos-busqueda"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, SKU, talla o color"
                className={cn('min-h-[44px] w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm', enfoque)}
              />
            </div>
          </div>

          {pos.catalogo.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-500">
              Este equipo todavía no tiene el catálogo guardado. Conéctalo a internet una vez para descargarlo; después podrás vender sin conexión.
            </p>
          ) : resultados.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-500">Ninguna prenda coincide con “{busqueda}”.</p>
          ) : (
            <ul
              tabIndex={0}
              aria-label="Prendas del catálogo"
              className={cn('max-h-[65vh] divide-y divide-gray-100 overflow-y-auto', enfoque)}
            >
              {resultados.slice(0, MAX_RESULTADOS).map((v) => {
                const enTicket = ticket.get(v.varianteId) ?? 0;
                const libre = v.stockLocal - enTicket;
                return (
                  <li key={v.varianteId} className="flex items-center gap-3 px-4 py-3">
                    <img
                      src={getImageUrl(v.imagen)}
                      alt=""
                      loading="lazy"
                      className="h-14 w-11 shrink-0 rounded-md bg-gray-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{v.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {v.talla} · {v.color} · <span className="tabular-nums">{v.sku}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-gray-900">${v.precio.toFixed(2)}</p>
                      <p className={cn('text-xs tabular-nums', v.stockLocal === 0 ? 'font-medium text-red-700' : 'text-gray-500')}>
                        {v.stockLocal === 0 ? 'Agotado' : `${v.stockLocal} disp.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cambiar(v.varianteId, 1)}
                      disabled={libre <= 0}
                      aria-label={`Agregar ${v.nombre}, talla ${v.talla}, color ${v.color}`}
                      className={cn(
                        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400',
                        enfoque,
                      )}
                    >
                      <Plus className="h-5 w-5" aria-hidden />
                    </button>
                  </li>
                );
              })}
              {resultados.length > MAX_RESULTADOS && (
                <li className="px-4 py-3 text-center text-xs text-gray-500">
                  Mostrando {MAX_RESULTADOS} de {resultados.length}. Afina la búsqueda para ver el resto.
                </li>
              )}
            </ul>
          )}
        </section>

        <aside aria-labelledby="titulo-ticket" className="h-fit rounded-xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-4">
          <h2 id="titulo-ticket" className="border-b border-gray-200 px-5 py-4 text-base font-semibold text-gray-900">Venta actual</h2>

          {lineas.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">Agrega prendas desde el catálogo.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lineas.map(({ variante: v, cantidad }) => (
                <li key={v.varianteId} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{v.nombre}</p>
                    <p className="text-xs text-gray-500">{v.talla} · {v.color} · ${v.precio.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => cambiar(v.varianteId, -1)} aria-label={`Quitar una unidad de ${v.nombre}`}
                      className={cn('inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100', enfoque)}>
                      <Minus className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-label={`${cantidad} unidades`}>{cantidad}</span>
                    <button type="button" onClick={() => cambiar(v.varianteId, 1)} disabled={cantidad >= v.stockLocal} aria-label={`Agregar una unidad de ${v.nombre}`}
                      className={cn('inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40', enfoque)}>
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => cambiar(v.varianteId, -cantidad)} aria-label={`Quitar ${v.nombre} de la venta`}
                      className={cn('ml-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-700', enfoque)}>
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-4 border-t border-gray-200 p-5">
            <div>
              <label htmlFor="pos-cliente" className="mb-1 block text-xs font-medium text-gray-600">Cliente (opcional)</label>
              <input id="pos-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={120}
                className={cn('min-h-[44px] w-full rounded-lg border border-gray-200 px-3 text-sm', enfoque)} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-600">Total en efectivo</span>
              <span className="text-2xl font-bold tabular-nums text-gray-900">${total.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={registrar}
              disabled={!lineas.length || registrando || !pos.sesion}
              className={cn(
                'min-h-[48px] w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400',
                enfoque,
              )}
            >
              {pos.isOnline ? 'Registrar venta' : 'Guardar venta en este equipo'}
            </button>
            <p className="text-xs text-gray-500">
              {pos.isOnline
                ? 'La venta se guarda aquí y se envía de inmediato.'
                : 'Sin conexión: la venta queda guardada y se enviará sola cuando vuelva internet. Tarjeta y QR no están disponibles sin conexión.'}
            </p>
          </div>
        </aside>
      </div>

      <ColaSincronizacion
        ventas={pos.ventas}
        onReintentar={(id) => conAccion(() => pos.reintentar(id), 'No se pudo reintentar la venta.')()}
        onAjustar={(v) => conAccion(() => pos.ajustar(v), 'No se pudo ajustar la venta.')()}
        onCancelar={(id) => conAccion(() => pos.cancelar(id), 'No se pudo cancelar la venta.')()}
        onLimpiar={() => conAccion(pos.limpiarSincronizadas, 'No se pudo limpiar la lista.')()}
      />
    </div>
  );
};
