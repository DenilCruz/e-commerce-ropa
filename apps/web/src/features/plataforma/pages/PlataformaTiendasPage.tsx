import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { plataformaApi, mensajeDeError } from '../services/plataforma.api';
import {
  ETIQUETA_ESTADO_TIENDA,
  ETIQUETA_PLAN,
  formatearFecha,
  rangoPagina,
  situacionVencimiento,
} from '../lib/formato';
import { Cargando, ErrorCarga, Etiqueta, FOCO, Paginador, SinResultados } from '../components/ui';
import { ConfirmarAccionModal } from '../components/ConfirmarAccionModal';
import type { EstadoTienda, PlanId, TiendaPlataforma } from '../types';

const LIMITE = 20;
const CAMPO = `rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ${FOCO}`;

export const PlataformaTiendasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [plan, setPlan] = useState<PlanId | ''>('');
  const [estado, setEstado] = useState<EstadoTienda | ''>('');
  const [pagina, setPagina] = useState(1);
  const [objetivo, setObjetivo] = useState<TiendaPlataforma | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  // Search runs after a short pause so each keystroke does not hit the API
  useEffect(() => {
    const id = setTimeout(() => {
      setBusqueda(texto.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(id);
  }, [texto]);

  const filtros = { busqueda, plan, estado, pagina, limite: LIMITE };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['plataforma-tiendas', filtros],
    queryFn: () => plataformaApi.tiendas(filtros),
    placeholderData: (anterior) => anterior,
  });

  const cambiarEstado = useMutation({
    mutationFn: (tienda: TiendaPlataforma) =>
      tienda.estado === 'ACTIVA' ? plataformaApi.suspender(tienda.id) : plataformaApi.reactivar(tienda.id),
    onSuccess: (_resp, tienda) => {
      toast.success(tienda.estado === 'ACTIVA' ? `Tienda "${tienda.nombre}" suspendida.` : `Tienda "${tienda.nombre}" reactivada.`);
      setObjetivo(null);
      queryClient.invalidateQueries({ queryKey: ['plataforma-tiendas'] });
      queryClient.invalidateQueries({ queryKey: ['plataforma-resumen'] });
    },
    onError: (err) => setErrorAccion(mensajeDeError(err)),
  });

  const abrirConfirmacion = (tienda: TiendaPlataforma) => {
    setErrorAccion(null);
    setObjetivo(tienda);
  };

  const suspendiendo = objetivo?.estado === 'ACTIVA';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl text-stone-900">Tiendas</h2>
        <p className="text-sm text-stone-500">Todas las tiendas de la plataforma. Una tienda suspendida no puede iniciar sesión ni ser abierta por sus clientes.</p>
      </div>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[14rem]">
          <span className="block text-[11px] uppercase tracking-widest font-semibold text-stone-500 mb-1">Buscar</span>
          <span className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" aria-hidden />
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Nombre, slug o correo del propietario"
              maxLength={100}
              className={`${CAMPO} w-full pl-9`}
            />
          </span>
        </label>
        <label>
          <span className="block text-[11px] uppercase tracking-widest font-semibold text-stone-500 mb-1">Plan</span>
          <select value={plan} onChange={(e) => { setPlan(e.target.value as PlanId | ''); setPagina(1); }} className={CAMPO}>
            <option value="">Todos</option>
            {(Object.keys(ETIQUETA_PLAN) as PlanId[]).map((p) => (
              <option key={p} value={p}>{ETIQUETA_PLAN[p]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="block text-[11px] uppercase tracking-widest font-semibold text-stone-500 mb-1">Estado</span>
          <select value={estado} onChange={(e) => { setEstado(e.target.value as EstadoTienda | ''); setPagina(1); }} className={CAMPO}>
            <option value="">Todos</option>
            {(Object.keys(ETIQUETA_ESTADO_TIENDA) as EstadoTienda[]).map((s) => (
              <option key={s} value={s}>{ETIQUETA_ESTADO_TIENDA[s]}</option>
            ))}
          </select>
        </label>
      </form>

      <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden" aria-busy={isFetching}>
        {isLoading ? (
          <Cargando texto="Cargando tiendas" />
        ) : error || !data ? (
          <ErrorCarga mensaje={mensajeDeError(error)} onReintentar={() => refetch()} />
        ) : data.items.length === 0 ? (
          <SinResultados texto="Ninguna tienda coincide con los filtros." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Tiendas de la plataforma</caption>
                <thead className="bg-stone-50 text-left text-[11px] uppercase tracking-widest text-stone-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Tienda</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Propietario</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Usuarios</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Productos</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Pedidos</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Vence</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Creada</th>
                    <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.items.map((t) => {
                    const vence = situacionVencimiento(t.venceEn);
                    return (
                      <tr key={t.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-900">{t.nombre}</div>
                          <div className="text-[11px] text-stone-500">/{t.slug}</div>
                        </td>
                        <td className="px-4 py-3 text-stone-700">{t.propietarioCorreo ?? '—'}</td>
                        <td className="px-4 py-3"><Etiqueta color="dorado">{ETIQUETA_PLAN[t.plan] ?? t.plan}</Etiqueta></td>
                        <td className="px-4 py-3">
                          <Etiqueta color={t.estado === 'ACTIVA' ? 'verde' : 'rojo'}>{ETIQUETA_ESTADO_TIENDA[t.estado] ?? t.estado}</Etiqueta>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{t.usuarios}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{t.productos}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{t.pedidos}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={vence === 'vencido' ? 'text-rose-700 font-semibold' : vence === 'por-vencer' ? 'text-amber-700 font-semibold' : 'text-stone-700'}>
                            {formatearFecha(t.venceEn)}
                          </span>
                          {vence === 'vencido' && <span className="ml-1 text-[11px] text-rose-700">vencida</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-stone-700">{formatearFecha(t.creadoEn)}</td>
                        <td className="px-4 py-3 text-right">
                          {t.esBase ? (
                            <span className="text-[11px] text-stone-500">Tienda base</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => abrirConfirmacion(t)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                                t.estado === 'ACTIVA'
                                  ? 'border-rose-300 text-rose-800 hover:bg-rose-50'
                                  : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                              } ${FOCO}`}
                            >
                              {t.estado === 'ACTIVA' ? 'Suspender' : 'Reactivar'}
                              <span className="sr-only"> {t.nombre}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Paginador pagina={data.pagina} totalPaginas={data.totalPaginas} resumen={rangoPagina(data.pagina, data.limite, data.total)} onCambiar={setPagina} />
          </>
        )}
      </div>

      <ConfirmarAccionModal
        abierto={objetivo !== null}
        titulo={suspendiendo ? 'Suspender tienda' : 'Reactivar tienda'}
        descripcion={
          suspendiendo
            ? `"${objetivo?.nombre}" dejará de estar disponible: sus usuarios no podrán iniciar sesión y las sesiones abiertas dejarán de funcionar. Podrás reactivarla en cualquier momento.`
            : `"${objetivo?.nombre}" volverá a estar disponible para sus usuarios y clientes.`
        }
        etiquetaConfirmar={suspendiendo ? 'Suspender tienda' : 'Reactivar tienda'}
        peligroso={suspendiendo}
        enviando={cambiarEstado.isPending}
        error={errorAccion}
        onConfirmar={() => objetivo && cambiarEstado.mutate(objetivo)}
        onCancelar={() => setObjetivo(null)}
      />
    </div>
  );
};
