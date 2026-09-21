import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Package,
  Truck,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { paymentsApi } from '../services/payments.api';
import { OrdenRespuesta } from '../types';
import { useCartStore } from '../../../store/cart.store';

export const CheckoutReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clearCart = useCartStore((state) => state.clearCart);

  const sessionId = searchParams.get('session_id');

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orden, setOrden] = useState<OrdenRespuesta | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError('No se proporcionó un ID de sesión válido de Stripe.');
      setCargando(false);
      return;
    }

    const verificarSesion = async () => {
      try {
        setCargando(true);
        const res = await paymentsApi.consultarEstadoSesion(sessionId);

        if (res.orden) {
          setOrden(res.orden);
          clearCart();
        } else if (res.status === 'open') {
          setError('El proceso de pago aún no ha sido completado.');
        } else {
          setError('No se pudo confirmar el pago de la sesión.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Error al validar el pago con Stripe.');
      } finally {
        setCargando(false);
      }
    };

    verificarSesion();
  }, [sessionId, clearCart]);

  const copiarTracking = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg border border-gray-100 space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Verificando Pago con Stripe...</h2>
          <p className="text-sm text-gray-500">
            Estamos confirmando la transacción con la pasarela segura y generando tu orden de compra.
          </p>
        </div>
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg border border-gray-100 space-y-5">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900">No se pudo confirmar la compra</h2>
          <p className="text-sm text-gray-600 bg-rose-50/50 p-3 rounded-xl border border-rose-100">
            {error || 'Hubo un inconveniente al procesar tu solicitud.'}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition"
            >
              Volver al Checkout
            </button>
            <Link
              to="/"
              className="w-full py-3 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition text-center"
            >
              Ir a la Tienda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-gray-50 to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* HEADER DE ÉXITO */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-emerald-100 shadow-xl text-center space-y-4 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none" />
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full">
            Stripe Embedded Checkout Exitoso
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            ¡Pago Aprobado y Pedido Confirmado!
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-lg mx-auto">
            Hemos procesado tu pago de forma segura a través de Stripe. Tu orden está siendo preparada en nuestro centro de distribución.
          </p>

          <div className="inline-flex items-center gap-2 bg-gray-50 px-5 py-2.5 rounded-2xl border border-gray-200 text-sm font-mono font-bold text-gray-800 mt-2">
            <span>Nro. de Orden:</span>
            <span className="text-indigo-600 font-extrabold">{orden.nroOrden}</span>
          </div>
        </div>

        {/* TARJETA DE RASTREO Y ENVÍO EN VIVO (HU-64) */}
        {orden.envio?.numeroTracking && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <Truck className="w-6 h-6 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Rastreo de Envío en Vivo</h3>
                  <p className="text-xs text-indigo-200">
                    Sigue tu paquete en tiempo real sobre el mapa interactivo con OpenStreetMap
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                <span className="text-xs font-mono font-bold text-amber-300">
                  {orden.envio.numeroTracking}
                </span>
                <button
                  type="button"
                  onClick={() => copiarTracking(orden.envio!.numeroTracking)}
                  className="p-1 hover:bg-white/20 rounded text-white transition"
                  title="Copiar código"
                >
                  {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to={`/tracking/${orden.envio.numeroTracking}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-black rounded-xl shadow-lg transition"
              >
                <span>Abrir Mapa y Rastreo en Vivo</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* DETALLES DE LA COMPRA */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <Package className="w-5 h-5 text-gray-900" />
            <h3 className="font-bold text-gray-900">Resumen de la Transacción</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <span className="text-xs text-gray-500 block mb-1 uppercase font-bold">Estado del Pago</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {orden.pago?.estado || 'APROBADO'}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <span className="text-xs text-gray-500 block mb-1 uppercase font-bold">Total Pagado</span>
              <span className="text-lg font-black text-gray-900">
                Bs. {orden.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* ACCIONES */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link
              to="/orders"
              className="flex-1 py-3.5 px-6 bg-black text-white font-bold text-sm rounded-xl text-center hover:bg-gray-800 transition flex items-center justify-center gap-2"
            >
              <span>Ver en Mis Pedidos</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="flex-1 py-3.5 px-6 bg-gray-100 text-gray-800 font-bold text-sm rounded-xl text-center hover:bg-gray-200 transition flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Seguir Comprando</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
