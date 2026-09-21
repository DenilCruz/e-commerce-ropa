import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  Truck,
  ArrowRight,
  Printer,
  Calendar,
  ChevronRight,
  Ban,
  AlertTriangle,
  History,
  X,
} from 'lucide-react';
import { ordersApi } from '../services/orders.api';
import { Pedido, PedidoItem, HistorialAuditoria } from '../types';

export const OrdersPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

  // Estado para cancelación de pedido (HU-51)
  const [pedidoACancelar, setPedidoACancelar] = useState<Pedido | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelacion, setErrorCancelacion] = useState<string | null>(null);

  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async () => {
    setCargando(true);
    try {
      const data = await ordersApi.obtenerMisPedidos();
      setPedidos(data);
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleCancelarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoACancelar) return;

    try {
      setCancelando(true);
      setErrorCancelacion(null);
      await ordersApi.cancelarPedido(pedidoACancelar.id, motivoCancelacion);
      setPedidoACancelar(null);
      setMotivoCancelacion('');
      await cargarPedidos();
      if (pedidoSeleccionado?.id === pedidoACancelar.id) {
        setPedidoSeleccionado(null);
      }
    } catch (err: any) {
      setErrorCancelacion(
        err.response?.data?.message || 'No se pudo cancelar el pedido. Intenta nuevamente.',
      );
    } finally {
      setCancelando(false);
    }
  };

  const puedeCancelar = (p: Pedido) => {
    const estadosPermitidos = ['PENDIENTE', 'PAGADO'];
    if (!estadosPermitidos.includes(p.estado)) return false;
    if (p.envio && ['EN_CAMINO', 'EN_REPARTO', 'ENTREGADO'].includes(p.envio.estado)) {
      return false;
    }
    return true;
  };

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroEstado === 'TODOS') return true;
    if (filtroEstado === 'PAGADO') return p.estado === 'PAGADO' || p.pago?.estado === 'APROBADO';
    if (filtroEstado === 'PENDIENTE') return p.estado === 'PENDIENTE' || p.pago?.estado === 'PENDIENTE';
    if (filtroEstado === 'ENVIADO') return p.estado === 'ENVIADO' || p.envio?.estado === 'EN_CAMINO';
    if (filtroEstado === 'ENTREGADO') return p.estado === 'ENTREGADO' || p.envio?.estado === 'ENTREGADO';
    if (filtroEstado === 'CANCELADO') return p.estado === 'CANCELADO';
    if (filtroEstado === 'REEMBOLSADO') return p.estado === 'REEMBOLSADO' || p.pago?.estado === 'REEMBOLSADO';
    return true;
  });

  const getStatusBadge = (estado: string, estadoPago?: string) => {
    if (estado === 'REEMBOLSADO' || estadoPago === 'REEMBOLSADO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
          <RotateCcw className="w-3.5 h-3.5" />
          Reembolsado
        </span>
      );
    }
    if (estado === 'ENTREGADO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Entregado
        </span>
      );
    }
    if (estado === 'ENVIADO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
          <Truck className="w-3.5 h-3.5" />
          Enviado en Camino
        </span>
      );
    }
    if (estado === 'PAGADO' || estadoPago === 'APROBADO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Pago Aprobado
        </span>
      );
    }
    if (estado === 'PENDIENTE' || estadoPago === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <Clock className="w-3.5 h-3.5" />
          Pago Pendiente
        </span>
      );
    }
    if (estado === 'CANCELADO' || estadoPago === 'RECHAZADO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
          <XCircle className="w-3.5 h-3.5" />
          Cancelado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
        {estado}
      </span>
    );
  };

  return (
    <div className="py-8 max-w-7xl mx-auto px-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            <Link to="/" className="hover:text-black">Inicio</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Mis Compras</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Historial de Pedidos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Revisa tus pedidos, rastrea tus entregas en el mapa en vivo y gestiona cancelaciones.
          </p>
        </div>

        <Link
          to="/tracking"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-xl text-xs hover:bg-indigo-100 transition shadow-sm"
        >
          <Truck className="w-4 h-4" />
          <span>Rastrear Guía de Envío</span>
        </Link>
      </div>

      {/* FILTROS DE ESTADO */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['TODOS', 'PENDIENTE', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO', 'REEMBOLSADO'].map(
          (filtro) => (
            <button
              key={filtro}
              onClick={() => setFiltroEstado(filtro)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                filtroEstado === filtro
                  ? 'bg-black text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {filtro}
            </button>
          ),
        )}
      </div>

      {/* LISTADO DE PEDIDOS */}
      {cargando ? (
        <div className="py-20 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Cargando tus pedidos...</p>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm max-w-md mx-auto my-10">
          <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No hay pedidos</h3>
          <p className="text-gray-500 text-xs mb-6">
            {filtroEstado === 'TODOS'
              ? 'Aún no has realizado ninguna compra en El Magnífico.'
              : `No tienes pedidos con estado "${filtroEstado}".`}
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition text-sm"
          >
            Ir al Catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidosFiltrados.map((pedido) => (
            <div
              key={pedido.id}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition space-y-4"
            >
              {/* TOP ROW: NRO, FECHA, BADGE */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 font-bold">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-base font-black text-gray-900">{pedido.nro}</span>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(pedido.fecha).toLocaleDateString('es-BO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {getStatusBadge(pedido.estado, pedido.pago?.estado)}
                </div>
              </div>

              {/* ITEMS PREVIEW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Prendas ({pedido.items?.length || 0})
                  </span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {pedido.items?.map((it: PedidoItem) => (
                      <div key={it.id} className="text-xs flex justify-between items-center py-1">
                        <span className="font-semibold text-gray-800 truncate mr-2">
                          {it.nombre} <span className="text-gray-400 font-normal">({it.talla} / {it.color}) × {it.cantidad}</span>
                        </span>
                        <span className="font-bold text-gray-900 flex-shrink-0">
                          Bs. {it.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* INFO DE PAGO Y TOTAL */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-between border border-gray-100">
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Método de Pago:</span>
                      <span className="font-bold text-gray-900">
                        {pedido.pago?.metodoPago || 'Tarjeta Stripe'}
                      </span>
                    </div>
                    {pedido.envio?.numeroTracking && (
                      <div className="flex justify-between items-center pt-1 border-t border-gray-200/60">
                        <span className="text-indigo-700 font-bold">Guía de Envío:</span>
                        <span className="font-mono font-bold text-indigo-950">
                          {pedido.envio.numeroTracking}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-200 mt-2 flex justify-between items-baseline">
                    <span className="text-xs font-bold uppercase text-gray-500">Total Pedido</span>
                    <span className="text-xl font-black text-gray-900">
                      Bs. {pedido.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACCIONES DEL PEDIDO */}
              <div className="pt-3 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
                <div>
                  {puedeCancelar(pedido) && (
                    <button
                      onClick={() => setPedidoACancelar(pedido)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancelar Pedido</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/tracking/${pedido.envio?.numeroTracking || pedido.nro}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Rastrear Envío</span>
                  </Link>

                  <button
                    onClick={() => setPedidoSeleccionado(pedido)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Detalle</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CANCELAR PEDIDO (HU-51) */}
      {pedidoACancelar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-gray-900 text-center mb-1">
              ¿Deseas cancelar el pedido {pedidoACancelar.nro}?
            </h3>
            <p className="text-xs text-gray-500 text-center mb-4 leading-relaxed">
              Al confirmar, el pedido será marcado como <strong className="text-red-600">CANCELADO</strong> y las prendas se devolverán automáticamente al stock de la tienda.
            </p>

            {errorCancelacion && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorCancelacion}
              </div>
            )}

            <form onSubmit={handleCancelarPedido} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Motivo de cancelación (opcional)
                </label>
                <textarea
                  rows={2}
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Ej. Me equivoqué de talla, ya no requiero la prenda..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={cancelando}
                  onClick={() => setPedidoACancelar(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={cancelando}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  {cancelando ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE COMPROBANTE E HISTORIAL (HU-50 & HU-55) */}
      {pedidoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
            <div className="flex justify-between items-start pb-4 border-b border-gray-200">
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Detalle de Compra</span>
                <h2 className="text-2xl font-black text-gray-900">{pedidoSeleccionado.nro}</h2>
              </div>
              <button
                onClick={() => setPedidoSeleccionado(null)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 space-y-6">
              {/* STATUS BANNER */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div>
                  <span className="text-xs text-gray-500 block">Estado Actual</span>
                  <p className="text-sm font-bold text-gray-900">{pedidoSeleccionado.estado}</p>
                </div>
                {getStatusBadge(pedidoSeleccionado.estado, pedidoSeleccionado.pago?.estado)}
              </div>

              {/* GUÍA DE ENVÍO */}
              {pedidoSeleccionado.envio && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      <span>{pedidoSeleccionado.envio.empresaTransportadora || 'Courier Local'}</span>
                    </div>
                    <div className="text-xs text-indigo-700 font-mono mt-0.5">
                      Guía: {pedidoSeleccionado.envio.numeroTracking}
                    </div>
                  </div>
                  <Link
                    to={`/tracking/${pedidoSeleccionado.envio.numeroTracking}`}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <span>Ver Mapa Satelital</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* DETALLES DE COMPRA */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prendas Adquiridas</h3>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  {pedidoSeleccionado.items?.map((it: PedidoItem) => (
                    <div key={it.id} className="p-3 flex justify-between items-center text-sm bg-white">
                      <div>
                        <p className="font-bold text-gray-900">{it.nombre}</p>
                        <p className="text-xs text-gray-500">
                          Talla: {it.talla} · Color: {it.color} · Cantidad: {it.cantidad}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900">Bs. {it.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOTALES */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>Bs. {pedidoSeleccionado.subtotal.toFixed(2)}</span>
                </div>
                {pedidoSeleccionado.descuento > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Descuento</span>
                    <span>- Bs. {pedidoSeleccionado.descuento.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Costo de Envío</span>
                  <span>{pedidoSeleccionado.costoEnvio === 0 ? 'Gratis' : `Bs. ${pedidoSeleccionado.costoEnvio.toFixed(2)}`}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between text-base font-black text-gray-900">
                  <span>Total</span>
                  <span>Bs. {pedidoSeleccionado.total.toFixed(2)}</span>
                </div>
              </div>

              {/* LÍNEA DE HISTORIAL DE AUDITORÍA (HU-55) */}
              {pedidoSeleccionado.historial && pedidoSeleccionado.historial.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-600" />
                    Historial de Cambios de Estado (HU-55)
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 divide-y divide-gray-100">
                    {pedidoSeleccionado.historial.map((h: HistorialAuditoria, i: number) => (
                      <div key={h.id || i} className={`text-xs ${i > 0 ? 'pt-3' : ''}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-gray-900">
                            {h.estadoAnterior ? `${h.estadoAnterior} → ${h.estadoNuevo}` : h.estadoNuevo}
                          </span>
                          <span className="text-gray-400">
                            {new Date(h.creadoEn).toLocaleString('es-BO')}
                          </span>
                        </div>
                        {h.comentario && (
                          <p className="text-gray-600 italic">"{h.comentario}"</p>
                        )}
                        <span className="text-[10px] text-gray-400 block mt-0.5">Por: {h.autor || 'Sistema'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
              <div>
                {puedeCancelar(pedidoSeleccionado) && (
                  <button
                    onClick={() => {
                      setPedidoACancelar(pedidoSeleccionado);
                      setPedidoSeleccionado(null);
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    Cancelar este pedido
                  </button>
                )}
              </div>

              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default OrdersPage;
