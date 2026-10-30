import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { planesApi } from '../services/planes.api';
import { PLAN_NOMBRES_FALLBACK, interpretarCompra } from '../utils/planes';

const formatearFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

/**
 * Where Stripe sends the customer back after paying. The redirect proves nothing by itself: the plan is activated
 * by Stripe's webhook, so this screen asks the server for the purchase state until it is no longer pending.
 */
export const PlanRetornoPage: React.FC = () => {
  const [params] = useSearchParams();
  const sesionId = params.get('session_id');
  const queryClient = useQueryClient();
  const inicio = useRef(Date.now());
  const [segundos, setSegundos] = useState(0);

  const { data: estado, isError } = useQuery({
    queryKey: ['estado-compra-plan', sesionId],
    queryFn: () => planesApi.obtenerEstadoCompra(sesionId as string),
    enabled: !!sesionId,
    refetchInterval: (consulta) => (consulta.state.data?.estado === 'PENDIENTE_PAGO' || !consulta.state.data ? 2000 : false),
  });

  useEffect(() => {
    const temporizador = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000);
    return () => clearInterval(temporizador);
  }, []);

  const fase = interpretarCompra(estado, segundos);

  useEffect(() => {
    if (fase.fase === 'ACTIVA') queryClient.invalidateQueries({ queryKey: ['mis-tiendas-pricing'] });
  }, [fase.fase, queryClient]);

  const tarjeta = 'max-w-md mx-auto bg-white border border-[#E7E1D7] rounded-2xl p-8 text-center space-y-4 shadow-xs';

  return (
    <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4 py-16">
      {!sesionId || isError ? (
        <div className={tarjeta}>
          <AlertCircle className="w-10 h-10 text-rose-700 mx-auto" aria-hidden />
          <h1 className="font-serif text-2xl text-stone-900">No encontramos tu compra</h1>
          <p className="text-sm text-stone-600">Revisa tu correo o vuelve a la página de planes para intentarlo de nuevo.</p>
          <Link to="/planes" className="inline-block px-5 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-widest">
            Ver planes
          </Link>
        </div>
      ) : fase.fase === 'ACTIVA' ? (
        <div className={tarjeta}>
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" aria-hidden />
          <h1 className="font-serif text-2xl text-stone-900">¡Plan activado!</h1>
          <p className="text-sm text-stone-600">
            Tu tienda ya tiene el plan <strong className="text-stone-900">{PLAN_NOMBRES_FALLBACK[fase.plan] ?? fase.plan}</strong>
            {formatearFecha(fase.venceEn) && <> hasta el {formatearFecha(fase.venceEn)}</>}.
          </p>
          <Link to="/admin" className="inline-block px-5 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-widest">
            Ir al panel de administración
          </Link>
        </div>
      ) : fase.fase === 'NO_COMPLETADO' ? (
        <div className={tarjeta}>
          <AlertCircle className="w-10 h-10 text-rose-700 mx-auto" aria-hidden />
          <h1 className="font-serif text-2xl text-stone-900">El pago no se completó</h1>
          <p className="text-sm text-stone-600">
            {fase.motivo === 'EXPIRADA' ? 'La sesión de pago venció antes de terminar.' : 'Stripe no pudo procesar el pago.'} No se hizo ningún
            cargo y tu plan no cambió.
          </p>
          <Link to="/planes" className="inline-block px-5 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-widest">
            Volver a intentar
          </Link>
        </div>
      ) : fase.fase === 'DEMORA' ? (
        <div className={tarjeta}>
          <Clock className="w-10 h-10 text-[#9B7B54] mx-auto" aria-hidden />
          <h1 className="font-serif text-2xl text-stone-900">Tu pago sigue en proceso</h1>
          <p className="text-sm text-stone-600">
            Stripe todavía no confirmó el pago. Si ya se hizo el cobro, tu plan se activará solo en cuanto llegue la confirmación; no hace falta
            pagar de nuevo.
          </p>
          <Link to="/admin" className="inline-block px-5 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-widest">
            Ir al panel
          </Link>
        </div>
      ) : (
        <div className={tarjeta} role="status" aria-live="polite">
          <Loader2 className="w-10 h-10 text-[#9B7B54] mx-auto animate-spin" aria-hidden />
          <h1 className="font-serif text-2xl text-stone-900">Confirmando tu pago…</h1>
          <p className="text-sm text-stone-600">Estamos esperando la confirmación de Stripe. No cierres esta página.</p>
        </div>
      )}
    </main>
  );
};
