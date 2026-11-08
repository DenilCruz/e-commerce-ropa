import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, ArrowUpRight, AlertTriangle, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { usePlanLimites } from '../hooks/usePlanLimites';
import { planesApi, type MiSuscripcion } from '../services/planes.api';
import { toast } from 'sonner';

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });

/** Renewal state of the paid plan, with the controls to stop or resume it. The plan keeps working until the paid period ends. */
const SuscripcionDelPlan: React.FC = () => {
  const queryClient = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const { data } = useQuery<MiSuscripcion>({ queryKey: ['mi-suscripcion'], queryFn: planesApi.obtenerMiSuscripcion, retry: false });

  const actualizar = (nueva: MiSuscripcion) => {
    queryClient.setQueryData(['mi-suscripcion'], nueva);
  };
  const mensajeDe = (err: any, porDefecto: string) => {
    const msg = err?.response?.data?.message;
    return Array.isArray(msg) ? msg.join(', ') : msg || porDefecto;
  };
  const cancelar = useMutation({
    mutationFn: planesApi.cancelarRenovacion,
    onSuccess: (r) => {
      actualizar(r);
      setConfirmando(false);
      toast.success('Listo. Tu plan sigue activo hasta el final del período pagado y no se renovará.');
    },
    onError: (err) => toast.error(mensajeDe(err, 'No se pudo cancelar la renovación.')),
  });
  const reanudar = useMutation({
    mutationFn: planesApi.reanudarRenovacion,
    onSuccess: (r) => {
      actualizar(r);
      toast.success('La renovación automática volvió a activarse.');
    },
    onError: (err) => toast.error(mensajeDe(err, 'No se pudo reanudar la renovación.')),
  });
  const simular = useMutation({
    mutationFn: planesApi.simularCobro,
    onSuccess: (r, resultado) => {
      actualizar(r);
      toast[resultado === 'EXITOSO' ? 'success' : 'warning'](
        resultado === 'EXITOSO' ? 'Cobro del período aprobado: el plan se extendió.' : 'El cobro del período falló.',
      );
    },
    onError: (err) => toast.error(mensajeDe(err, 'No se pudo simular el cobro.')),
  });

  const suscripcion = data?.suscripcion;
  if (!suscripcion) return null;
  const ocupado = cancelar.isPending || reanudar.isPending || simular.isPending;

  return (
    <div className="pt-2 border-t border-gray-800/80 space-y-1.5 text-[10px]">
      <div className="flex items-center justify-between text-gray-400">
        <span className="uppercase tracking-wider font-medium text-[9px]">Suscripción</span>
        <span className="font-mono text-gray-300">
          ${suscripcion.monto} / {suscripcion.periodo === 'ANUAL' ? 'año' : 'mes'}
        </span>
      </div>
      <p className="text-gray-300">
        {suscripcion.cancelarAlVencer
          ? `No se renueva. Activo hasta el ${fechaCorta(suscripcion.venceEn)}.`
          : `Se renueva el ${fechaCorta(suscripcion.venceEn)}.`}
      </p>
      {suscripcion.ultimoCobroFallidoEn && !suscripcion.cancelarAlVencer && (
        <p className="flex items-start gap-1 text-amber-300" role="alert">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-px" aria-hidden />
          <span>El último cobro falló. Revisa tu método de pago para no perder el plan.</span>
        </p>
      )}

      {suscripcion.cancelarAlVencer ? (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => reanudar.mutate()}
          className="w-full px-2 py-1.5 rounded border border-gray-700 text-gray-200 hover:bg-gray-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B7B54]"
        >
          Reanudar renovación
        </button>
      ) : confirmando ? (
        <div className="space-y-1.5" role="group" aria-label="Confirmar cancelación">
          <p className="text-gray-300">¿Cancelar la renovación? Mantienes el plan hasta {fechaCorta(suscripcion.venceEn)}.</p>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => cancelar.mutate()}
              className="flex-1 px-2 py-1.5 rounded bg-rose-700 text-white hover:bg-rose-600 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              Sí, cancelar
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="flex-1 px-2 py-1.5 rounded border border-gray-700 text-gray-200 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B7B54]"
            >
              Volver
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="w-full px-2 py-1.5 rounded border border-gray-700 text-gray-300 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B7B54]"
        >
          Cancelar renovación
        </button>
      )}

      {data?.simulado && (
        <div className="pt-1.5 space-y-1" aria-label="Herramientas de la simulación">
          <p className="text-[9px] uppercase tracking-wider text-amber-400/80">Simulación de cobros</p>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => simular.mutate('EXITOSO')}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-gray-700 text-gray-200 hover:bg-gray-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B7B54]"
            >
              <RefreshCw className="w-3 h-3" aria-hidden />
              Cobro exitoso
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => simular.mutate('FALLIDO')}
              className="flex-1 px-2 py-1.5 rounded border border-gray-700 text-gray-200 hover:bg-gray-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B7B54]"
            >
              Cobro fallido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminPlanBadge: React.FC = () => {
  const { metricas, cargando } = usePlanLimites();
  const [copiado, setCopiado] = useState(false);

  if (cargando || !metricas) {
    return null;
  }

  const { plan, consumo, tienda } = metricas;
  const esFreeTrial = plan.id === 'FREE_TRIAL';
  const slug = tienda?.slug || 'aura';
  const publicUrl = `${window.location.origin}/t/${slug}`;

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiado(true);
      toast.success('¡Enlace de tu tienda copiado al portapapeles!');
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error('No se pudo copiar el enlace al portapapeles.');
    }
  };

  return (
    <div className="mx-0 mb-1 p-3.5 rounded-xl bg-gradient-to-b from-stone-900 to-[#121110] border border-[#2A2723] text-white space-y-3 shadow-lg">
      {/* Plan Header */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#9B7B54]" />
          <span className="text-xs font-bold tracking-tight text-white">{plan.nombre}</span>
        </div>
        <Link
          to="/planes#planes"
          className="text-[10px] font-bold uppercase text-[#9B7B54] hover:text-[#B5966E] flex items-center gap-0.5 tracking-wider"
          title="Ver planes y precios"
        >
          <span>Upgrade</span>
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Barras de Consumo */}
      <div className="space-y-2 text-[11px]">
        {/* Productos */}
        <div>
          <div className="flex items-center justify-between text-gray-400 font-mono text-[10px]">
            <span>Productos</span>
            <span className={consumo.productos.superado ? 'text-rose-400 font-bold' : 'text-gray-300'}>
              {consumo.productos.actual}/{consumo.productos.limite}
            </span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-0.5">
            <div
              className={`h-full transition-all duration-300 ${
                consumo.productos.superado ? 'bg-rose-500' : 'bg-[#9B7B54]'
              }`}
              style={{ width: `${Math.min(100, consumo.productos.porcentaje)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-gray-400 font-mono text-[10px]">
            <span>Sucursales</span>
            <span className={consumo.sucursales.superado ? 'text-rose-400 font-bold' : 'text-gray-300'}>
              {consumo.sucursales.actual}/{consumo.sucursales.limite}
            </span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-0.5">
            <div
              className={`h-full ${consumo.sucursales.superado ? 'bg-rose-500' : 'bg-stone-400'}`}
              style={{ width: `${Math.min(100, consumo.sucursales.porcentaje)}%` }}
            />
          </div>
        </div>

        {/* Personal / Usuarios */}
        <div>
          <div className="flex items-center justify-between text-gray-400 font-mono text-[10px]">
            <span>Personal</span>
            <span className={consumo.usuarios.superado ? 'text-rose-400 font-bold' : 'text-gray-300'}>
              {consumo.usuarios.actual}/{consumo.usuarios.limite}
            </span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-0.5">
            <div
              className={`h-full transition-all duration-300 ${
                consumo.usuarios.superado ? 'bg-rose-500' : 'bg-stone-400'
              }`}
              style={{ width: `${Math.min(100, consumo.usuarios.porcentaje)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Enlace Público para Clientes */}
      <div className="pt-2 border-t border-gray-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span className="uppercase tracking-wider font-medium text-[9px]">Link para tus clientes</span>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#9B7B54] hover:underline flex items-center gap-0.5 text-[10px]"
            title="Abrir tienda en nueva pestaña"
          >
            <span>Ver</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <button
          onClick={copiarEnlace}
          type="button"
          className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded bg-gray-850 hover:bg-gray-800 transition-colors text-[10px] text-gray-200 border border-gray-800"
          title="Copiar link para enviar a tus clientes"
        >
          <span className="truncate font-mono text-gray-300">/t/{slug}</span>
          {copiado ? (
            <span className="flex items-center gap-0.5 text-emerald-400 font-bold shrink-0">
              <Check className="w-3 h-3" />
              <span>Copiado</span>
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-[#9B7B54] font-medium shrink-0">
              <Copy className="w-3 h-3" />
              <span>Copiar</span>
            </span>
          )}
        </button>
      </div>

      {!esFreeTrial && <SuscripcionDelPlan />}

      {esFreeTrial && (
        <div className="pt-1 border-t border-gray-800/80 flex items-center gap-1.5 text-[10px] text-amber-300">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>
            {metricas.pruebaVencida
              ? 'La prueba terminó. Elige un plan para seguir cargando la tienda.'
              : metricas.pruebaVenceEn
                ? `Prueba hasta ${new Date(metricas.pruebaVenceEn).toLocaleDateString('es-BO')}`
                : 'Prueba gratis activa'}
          </span>
        </div>
      )}
    </div>
  );
};
